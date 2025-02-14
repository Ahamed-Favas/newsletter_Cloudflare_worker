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
      case "0 */6 * * *": // Runs at every 6 hours daily
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
    // const { results } =
    //   await env.DB
    //     .prepare(
    //       "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')")
    //     .all();
//   const newsHeadlines = ["Restoring names: Trump declares Feb 9 as Gulf of America Day","Super Bowl: Trump gets a loud cheer; Taylor Swift gets booed","England become team with most ODI defeats after posting 300-plus","Super Bowl: Fox's new scorebug sparks backlash","'Operation Devil Hunt' crackdown in Bangladesh: 1,308 arrested","Top stock recommendations for the week starting today","India-US relationship status set for update with Modi visit","NFL Super Bowl LIX: Tom Brady and Mike Pereira reacts to pass interference call","Rohit Sharma's hundred hailed as a 'boost' for India ahead of CT","75+ Happy Teddy Day messages, greetings, wishes and quotes for 2025","Super Bowl LIX injury updates: Mekhi Becton suffered a knee injury","'Government's capex spends set to gather pace'","Saif Ali Khan: I don’t know how he missed my carotid and jugular","India-US relationship status set for update with Modi visit","'Operation Devil Hunt' crackdown in Bangladesh: 1,308 arrested in nationwide sweep","Donald Trump gets a cheer as first US president to attend Super Bowl","Trump renames Gulf of Mexico, declares February 9 as Gulf of America Day","‘Canada as the 51st state?’: Trump says he is ‘serious’ in Super Bowl interview","Trump admin officials challenge judiciary’s authority over executive actions","Top stock recommendations for the week starting February 10, 2025","FPI selling continues, pull out Rs 7,300 crore from equities","Slowdown story: Middle class buys smaller soaps, bigger TVs","Chennai company bags Rs 3,251 crore sewage plant order in Saudi","Inflation picks up in China","Dosa batter company iD Fresh looks to list in 2 years","Edme eyes global insurance broking business after Birla company buy","'Government's capex spends set to gather pace'","Rohit Sharma's hundred hailed as a 'boost' for India ahead of Champions Trophy","England become team with most ODI defeats after posting 300-plus","Odisha govt to seek explanation from OCA over floodlight glitch","CT: Why India 'will have an advantage' over Pakistan","31 kg down in 9 months! Mom reveals weight loss mantra","'Looking forward': PM Modi remembers 'friend' Trump's first term before departing","Letter threatening to blow up Ahmedabad airport found, alert sounded","'Koi dikhaai nahi de raha': Akhilesh slams UP govt over jams, filth at Maha Kumbh","'What makes him intimidating to bowl to is ...': KP on Gill's batting","Gaurav Taneja after Ranveer Allahbadia’s adult joke: 'Lagta hai Samay Raina...'","Pak fans in meltdown after IND vs ENG floodlight failure","'I refused': DCP defends stopping Ed Sheeran's busking; singer says had permission","When will your loan EMIs come down? Govt to keep close eye","Bill Gates: Apple founder Steve Jobs was great at design but not a good ...","'Window closed for the day': IndiGo passenger books window seat, gets wall instead","'Playing domestic cricket benefitted me': Jadeja on his consistency","'Pakistan are still very dangerous': Shastri, Ponting ahead of CT","Woman, 23, dies of cardiac arrest while dancing at marriage function in MP"]
// const messages = [
//   {
//     role: "system",
//     content: "You are an AI agent tasked with selecting the most impactful news articles from a given list of news titles. Your goal is to prioritize stories that have the highest significance based on the following criteria:\n\n1. **Timeliness & Urgency** – Events or developments that require immediate attention or have a short-term impact.\n2. **Relevance to the Niche** – Stories that directly affect the target audience's industry, interests, or daily concerns.\n3. **Widespread Impact** – News that influences a large number of people, businesses, or systems.\n4. **Uniqueness & Novelty** – Highly unique, unexpected, or groundbreaking stories that stand out from routine updates.\n5. **Long-Term Consequences** – Events that may shape trends, regulations, or major shifts over time.\n\nYour task is to analyze the list of news titles and rank them based on these criteria. Select the upto 15 most impactful stories** and return only their indexes (1-based) in a comma-separated format with no additional text."
//   },
//   {
//     role: "user",
//     content: `Below is a list of news headlines. Please analyze them and return only the indexes (1-based) of the most impactful ones, separated by commas,  with no additional text:\n\n${newsHeadlines}`
//   }
// ];

//     const response = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", { messages });
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
    // return new Response(JSON.stringify({k: env.awsApiKey}))
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
          content: "You are an AI agent tasked with selecting the most impactful news articles from a given list of news titles. Your goal is to prioritize stories that have the highest significance based on the following criteria:\n\n1. **Timeliness & Urgency** – Events or developments that require immediate attention or have a short-term impact.\n2. **Relevance to the Niche** – Stories that directly affect the target audience's industry, interests, or daily concerns.\n3. **Widespread Impact** – News that influences a large number of people, businesses, or systems.\n4. **Uniqueness & Novelty** – Highly unique, unexpected, or groundbreaking stories that stand out from routine updates.\n5. **Long-Term Consequences** – Events that may shape trends, regulations, or major shifts over time.\n\nYour task is to analyze the list of news titles and rank them based on these criteria. Select the upto 15 most impactful stories** and return only their indexes (1-based) in a comma-separated format with no additional text."
        },
        {
          role: "user",
          content: `Below is a list of news headlines. Please analyze them and return only the indexes (1-based) of the most impactful ones, separated by commas, with no additional text:\n\n${newsHeadlines}`
        }
      ];
      const rankingResponse = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", { messages });
      // Parse indices
      let selectedIndices = []
      try {
        selectedIndices =
          rankingResponse.response.split(',')
            .map(n => parseInt(n.trim()) - 1)
            .filter(n => !isNaN(n) && n >= 0 && n < newsList.length)
            .slice(0, 8);  //  select upto 8 news
      } catch (error) {
        console.warn("failed to parse ai indeces")
        selectedIndices = newsList.slice(0, 8) // adjusting with available data
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
