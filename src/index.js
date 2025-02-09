import { addNewsDescriptions } from "./actions/addNewsDescriptions";
import { getUsers } from "./actions/getUsers";
import { parseFeed } from "./actions/parseRss";
import { sendEmail } from "./services/mailer";
import { sources } from "./sources/sources";
import { generateEmail } from "./template/template";

export default {
  async scheduled(event, env, ctx) {
    console.log("Running scheduled task at:", event.cron);
    switch (event.cron) {
      case "0 */4 * * *": // Runs at every 4 hours daily, 05:30, 09:30, 13:30
                          // 17:30, 21:30, 01:30 IST
        ctx.waitUntil(handleScheduledAction(env).catch(
          error => { console.error("Scheduled action failed:", error); }));
        break;
      case "30 18 */4 * *": // Runs at 12:00 AM IST, every 4 days
        ctx.waitUntil(handleScheduledDeletion(env).catch(
          error => { console.error("Scheduled deletion failed:", error); }));
        break;
      case "30 1 * * *": // Runs at every 7 AM IST
        ctx.waitUntil(handleScheduledMailing(env).catch(
          error => { console.error("Scheduled mailing failed:", error); }));
          break;
    }
  },
  // async fetch(request, env) {
  //   const { results } = await env.DB
  //       .prepare(
  //         "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')")
  //       .all();
  //       const newsGrouped = {};
    
  //   results.forEach(news => {
  //     const categoryValue = news.Category;
  //     if (!newsGrouped[categoryValue]) {
  //       newsGrouped[categoryValue] = []
  //     }
  //     newsGrouped[categoryValue].push(news)
  //   })

  //   let topNews = {};
  //   for (const category of Object.keys(newsGrouped)) {

  //     const newsList = newsGrouped[category];
  //     const newsHeadlines = newsList.map(n => n.Title).join('\n');
  //     // Asking AI to select top news headlines

  //     const messages = [
  //     { role: "system", content: "You are a journalist" },
  //     {
  //         role: "user",
  //         content: `From the following news headlines, order them from highest to lowest based on their impactfulness or news value, Return only the corresponding line numbers (1-based), separated by commas:\n\n${
  //           newsHeadlines}`,
  //       },
  //     ];
  //     const rankingResponse = await env.AI.run("@hf/meta-llama/meta-llama-3-8b-instruct", { messages });
  //     // Parse indices
  //     let selectedIndices = []
  //     try {
  //       selectedIndices =
  //         rankingResponse.response.split(',')
  //           .map(n => parseInt(n.trim()) - 1)
  //           .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
  //           .slice(0, 10);
  //     } catch (error) {
  //       console.warn("failed to parse ai indeces")
  //       selectedIndices = newsList.slice(0, 10) // adjusting with available data
  //     }

  //     // Order results based on indices
  //     const selectedNews = selectedIndices.map(index => newsList[index]);
  //     topNews[category] = selectedNews;
  //   }
  //   // generate summary for all selected news
  //   topNews = await addNewsDescriptions(topNews, env);
  //   return new Response(JSON.stringify(topNews))
  // }
};

async function handleScheduledAction(env)
{
  // getting content in every 6 hr.
  const feedContent = await parseFeed(sources, env);
  console.log("feedContent.length", feedContent.length);
  try {
    for (const item of feedContent) {
      await env.DB
        .prepare(
          "INSERT INTO NewsCollection (Feed, Category, Title, Link, pubDate, Id, Description, ImageUrl, contentClass, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(item.feed,
              item.category,
              item.title,
              item.link,
              item.pubDate,
              item.id,
              item.description,
              item.imageUrl,
              item.contentClass,
              item.createdAt)
        .run();
    }
  } catch (error) {
    console.error("Error occurred while adding to db", error);
    return;
  }
  console.log("feeds inserted to db successfully")
  return
}

async function handleScheduledDeletion(env)
{
  // deleting old contents
  try {
    await env.DB
      .prepare(
        "DELETE FROM NewsCollection WHERE createdAt < datetime('now', '-2 day')")
      .run();
    console.log("Old records deleted successfully");
  } catch (error) {
    console.error("Error occurred while deleting old records:", error);
  }
}

async function handleScheduledMailing(env)
{
  // for scheduled mailing
  const users = await getUsers(env);
  try {
    // select news which are only upto 1 day older.
    const { results } =
      await env.DB
        .prepare(
          "SELECT * FROM NewsCollection WHERE createdAt > datetime('now', '-1 day')")
        .all();

    if (!results || !Array.isArray(results)) {
      throw new Error("No results found or results is not an array");
    }

    //  sorting news based on their feed value
    const newsGrouped = {};
    results.forEach(news => {
      const categoryValue = news.Category;
      if (!newsGrouped[categoryValue]) {
        newsGrouped[categoryValue] = []
      }
      newsGrouped[categoryValue].push(news)
    })

    let topNews = {};
    for (const category of Object.keys(newsGrouped)) {

      const newsList = newsGrouped[category];
      const newsHeadlines = newsList.map(n => n.Title).join('\n');
      
      // Asking AI to select top news headlines
      const messages = [
      { role: "system", content: "You are a journalist" },
      {
          role: "user",
          content: `From the following news headlines, order them from highest to lowest based on their impactfulness or news value, Return only the corresponding line numbers (1-based), separated by commas:\n\n${
            newsHeadlines}`,
        },
      ];
      const rankingResponse = await env.AI.run("@hf/meta-llama/meta-llama-3-8b-instruct", { messages });
      // Parse indices
      let selectedIndices = []
      try {
        selectedIndices =
          rankingResponse.response.split(',')
            .map(n => parseInt(n.trim()) - 1)
            .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
            .slice(0, 6);  //  select upto 6 news
      } catch (error) {
        console.warn("failed to parse ai indeces")
        selectedIndices = newsList.slice(0, 6) // adjusting with available data
      }

      // Order results based on indices
      const selectedNews = selectedIndices.map(index => newsList[index]);
      topNews[category] = selectedNews;
    }
    // generate summary for all selected news
    topNews = await addNewsDescriptions(topNews, env);
    // generate emailhtml and send for each user
    // @ts-ignore
    for (const user of users) {

      const userEmail = user.email;
      const unsubscribeToken = user.unsubToken;
      const unsubUrl = `https://newsletter.pastpricing.com/api/mongo/${
        unsubscribeToken}`
      const userPrefers =
        Object.keys(user.preferences).filter(key => user.preferences[key]);
      // const userSources =
      //   Object.keys(user.sources).filter(key => user.sources[key]);

      // if (userSources.includes("Times of India")) { //   a s    o f    n o w
      const selectedFeeds = []
      userPrefers.map(pref => {
        if (Object.keys(topNews).includes(pref)) {
          selectedFeeds.push(...topNews[pref])
        }
      });
      if (selectedFeeds.length === 0) {
        console.log(`mail is not send for ${userEmail} (selectedFeed is zero)`)
        continue;
      }
      const emailHtml = generateEmail(selectedFeeds, unsubUrl);
      const emailResponse = await sendEmail(env, emailHtml, userEmail)

      if (emailResponse && emailResponse.ok)
      {
        console.log("Mail sent successfully")
      }
      else
      {
        console.error("Failed to send mail")
      }
    }
  } catch (error) {
    console.error("Internal Server Error", error);
    return
  }
}
