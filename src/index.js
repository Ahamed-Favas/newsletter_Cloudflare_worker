import { sendEmail } from "./services/mailer";
import { parseFeed } from "./actions/parseRss";
import { sources } from "./sources/sources";
import { getUsers } from "./actions/getUsers";
import { generateEmail } from "./template/template";


export default {
  async scheduled(event, env, ctx) {
    console.log("Running scheduled task at:", event.cron);
    switch (event.cron) {
      case "0 */4 * * *": // Runs at every 4 hours daily, 05:30, 09:30, 13:30 17:30, 21:30, 01:30 IST
        ctx.waitUntil(handleScheduledAction(env).catch(error => {
          console.error("Scheduled action failed:", error);
        }));
        break;
      case "30 18 */4 * *": // Runs at 12:00 AM IST, every 4 days
        ctx.waitUntil(handleScheduledDeletion(env).catch(error => {
          console.error("Scheduled deletion failed:", error);
        }));
        break;
      case "30 1 * * *": // Runs at every 7 AM IST
        ctx.waitUntil(handleScheduledMailing(env).catch(error => {
          console.error("Scheduled mailing failed:", error);
        }));
    }
  },
};


async function handleScheduledAction(env) {
  // getting content in every 6 hr.
  const feedContent = await parseFeed(sources, env);
  console.log("feedContent.length", feedContent.length);
  try {
    for (const item of feedContent) {
      await env.DB.prepare(
        "INSERT INTO NewsCollection (Feed, Category, Title, Link, pubDate, Id, Description, ImageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(
          item.feed,
          item.category,
          item.title,
          item.link,
          item.pubDate,
          item.id,
          item.description,
          item.imageUrl,
          item.createdAt
        )
        .run();
    }
  } catch (error) {
    console.error("Error occurred while adding to db", error);
    return;
  }
  console.log("feeds inserted to db successfully")
  return
}


async function handleScheduledDeletion(env) {
  // deleting old contents
  try {
    await env.DB.prepare(
      "DELETE FROM NewsCollection WHERE createdAt < datetime('now', '-2 day')"
    ).run();
    console.log("Old records deleted successfully");
  } catch (error) {
    console.error("Error occurred while deleting old records:", error);
  }
}


async function handleScheduledMailing(env) {
  // for scheduled mailing
  const users = await getUsers(env);
  try {
    // select news which are only upto 1 day older.
    const { results } = await env.DB.prepare(
            "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')"
          ).all();

    if (!results || !Array.isArray(results)) {
            throw new Error("No results found or results is not an array");
      }
    //  sorting news based on their feed value
    const newsGrouped = {};
    results.forEach(news => {
      const categoryValue = news.category;
      if (!newsGrouped[categoryValue]) {
        newsGrouped[categoryValue] = []
      }
      newsGrouped[categoryValue].push(news)
    })

    const topNews = {};
    for (const category of Object.keys(newsGrouped)) {

      const newsList = newsGrouped[category];
      const newsHeadlines = newsList.map(n => n.Title).join('\n');
      // Asking AI to select top news headlines
      const rankingResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
        prompt: `From the following news headlines, select up to 10 most important and impactful ones. Just return the line numbers (1-based) separated by commas:\n\n${newsHeadlines}`,
      });
      // Parse indices 
      let selectedIndices = []
      try {
        selectedIndices = rankingResponse.response
        .split(',')
        .map(n => parseInt(n.trim()) - 1)
        .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
        .slice(0, 10);
        } catch (error) {
          console.warn("failed to parse ai indeces")
          selectedIndices = newsList.slice(0, 10) // adjusting with available data
        }
      
      // Order results based on indices
      const selectedNews = selectedIndices.map(index => newsList[index]);
      topNews[category] = selectedNews;
    }
    // console.log(topNews);
    // generate emailhtml and send for each user
    for (const user of users){
      const userEmail = user.email;
      const unsubscribeToken = user.unsubToken;
      const unsubUrl = `https://nhttps://newsletter.pastpricing.com/api/mongo/${unsubscribeToken}`
      const userPrefers = Object.keys(user.preferences).filter(key => user.preferences[key]);
      const userSources = Object.keys(user.sources).filter(key => user.sources[key]);

      if ( userSources.includes("Times of India") ) {    //   a s    o f    n o w
        const selectedFeeds = []
        userPrefers.map(pref => {
          if (Object.keys(topNews).includes(pref)) {
            selectedFeeds.push(...topNews[pref])
          }
        });
        const emailHtml = generateEmail(selectedFeeds, unsubUrl);
        const emailResponse = await sendEmail(env, emailHtml, userEmail)

        if (emailResponse && emailResponse.ok) {
          console.log("Mail sent successfully")
        } else {
          console.error("Failed to send mail")
        }
      }
    }
  } catch (error) {
      console.error("Internal Server Error", error);
      return
  }
}
