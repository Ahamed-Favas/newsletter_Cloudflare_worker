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
      case "0 1,5,9,13,17,21 * * *": // Runs at every 4 hours daily, starting at 6.30 AM
        ctx.waitUntil(handleScheduledAction(env).catch(
          error => { console.error("Scheduled action failed:", error); }));
        break;
      case "30 18 */4 * *": // Runs at 12:00 AM IST, every 4 days
        ctx.waitUntil(handleScheduledDeletion(env).catch(
          error => { console.error("Scheduled deletion failed:", error); }));
        break;
      // dont forgot getUsers.js
      case "30 1 * * *": // Runs at every 7 AM IST
        ctx.waitUntil(handleScheduledMailing(env).catch(
          error => { console.error("Scheduled mailing failed:", error); }));
          break;
    }
  },
  // async fetch(request, env) {
  //   const { results } =
  //     await env.DB
  //       .prepare(
  //         "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')")
  //       .all();
  //   const newsGrouped = {};
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
  //       {
  //         role: "system",
  //         content: "You are an AI agent tasked with selecting the most impactful news articles from a given list of news titles. Your goal is to prioritize stories that have the highest significance based on the following criteria:1. Timeliness & Urgency – Events or developments that require immediate attention or have a short-term impact. 2. Relevance to the Niche – Stories that directly affect the target audience's industry, interests, or daily concerns. 3. Widespread Impact – News that influences a large number of people, businesses, or systems. 4. Uniqueness & Novelty – Highly unique, unexpected, or groundbreaking stories that stand out from routine updates. 5. Long-Term Consequences – Events that may shape trends, regulations, or major shifts over time. Your task is to analyze the list of news titles and rank them based on these criteria. Select the upto 15 most impactful stories and return only their indexes (1-based) in a comma-separated format with no additional text."
  //       },
  //       {
  //         role: "user",
  //         content: `Below is a list of news headlines. Please analyze them and return only the indexes (1-based) of the most impactful ones, separated by commas, with no additional text: ${newsHeadlines}`
  //       }
  //     ];
  //     let rankingResponse = {}
  //     try {
  //       rankingResponse = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", { messages });
  //     } catch (error) {
  //       console.warn("AI failed to pick top news at initial try")
  //       try {
  //         rankingResponse = await env.AI.run("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", { messages });
  //       } catch (error) {
  //         console.warn("AI failed to pick top news at fallback")
  //       }
  //     }
      
  //     // Parse indices
  //     let selectedIndices = []
  //     try {
  //       selectedIndices =
  //         rankingResponse.response.split(',')
  //           .map(n => parseInt(n.trim()) - 1)
  //           .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
  //           .slice(0, 15);  //  select upto 15 news
  //     } catch (error) {
  //       console.warn("failed to parse ai indeces")
  //       selectedIndices = newsList.slice(0, 15) // adjusting with available data
  //     }

  //     // Order results based on indices
  //     const selectedNews = selectedIndices.map(index => newsList[index]);
  //     topNews[category] = selectedNews;
  //   }
  //   return new Response (JSON.stringify(topNews))
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
          "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')")
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
        {
          role: "system",
          content: "You are an AI agent tasked with selecting the most impactful news articles from a given list of news titles. Your goal is to prioritize stories that have the highest significance based on the following criteria:1. Timeliness & Urgency – Events or developments that require immediate attention or have a short-term impact. 2. Relevance to the Niche – Stories that directly affect the target audience's industry, interests, or daily concerns. 3. Widespread Impact – News that influences a large number of people, businesses, or systems. 4. Uniqueness & Novelty – Highly unique, unexpected, or groundbreaking stories that stand out from routine updates. 5. Long-Term Consequences – Events that may shape trends, regulations, or major shifts over time. Your task is to analyze the list of news titles and rank them based on these criteria. Select the upto 15 most impactful stories and return only their indexes (1-based) in a comma-separated format with no additional text."
        },
        {
          role: "user",
          content: `Below is a list of news headlines. Please analyze them and return only the indexes (1-based) of the most impactful ones, separated by commas, with no additional text: ${newsHeadlines}`
        }
      ];
      let rankingResponse = {}
      try {
        rankingResponse = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", { messages });
      } catch (error) {
        console.warn("AI failed to pick top news at initial try")
        try {
          rankingResponse = await env.AI.run("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", { messages });
        } catch (error) {
          console.warn("AI failed to pick top news at fallback")
        }
      }
      
      // Parse indices
      let selectedIndices = []
      try {
        selectedIndices =
          rankingResponse.response.split(',')
            .map(n => parseInt(n.trim()) - 1)
            .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
            .slice(0, 15);  //  select upto 15 news
      } catch (error) {
        console.warn("failed to parse ai indeces")
        selectedIndices = newsList.slice(0, 15) // adjusting with available data
      }

      // Order results based on indices
      const selectedNews = selectedIndices.map(index => newsList[index]);
      topNews[category] = selectedNews;
    }
    // generate summary for all selected news
    topNews = await addNewsDescriptions(topNews, env).catch(error => {
      console.error('Failed to enrich description:', error);
      return topNews; // fallback to the original value
    });
    // generate emailhtml and send for each user
    // @ts-ignore
    for (const user of users) {

      const userEmail = user.email;
      const unsubscribeToken = user.unsubToken;
      const unsubUrl = `https://newsletter.pastpricing.com/unsubscribe/${
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
