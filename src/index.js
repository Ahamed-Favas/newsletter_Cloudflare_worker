import { sendEmail } from "./services/mailer";
import { parseFeed } from "./actions/parseRss";
import { sources } from "./feeds/sources";
import { generateEmail } from "./template/template";
import { getUsersMails } from "./actions/getUsers";

export default {
  async scheduled(event, env, ctx) {
    console.log("Running scheduled task at:", event.cron);
    switch (event.cron) {
      case "30 0,6,12,18 * * *": // Runs at every 6 AM, 12 PM, 6 PM, 12 AM IST
        try {
          ctx.waitUntil(handleScheduledAction(env));
        } catch (error) {
          console.error("Scheduled action failed:", error);
        }
        break;
      case "30 18 */2 * *": // Runs at 12:00 AM IST, every 2 days
        try {
          ctx.waitUntil(handleScheduledDeletion(env));
        } catch (error) {
          console.error("Scheduled deletion failed:", error);
        }
        break;
      case "30 1 * * *": // Runs at every 7 AM IST
        try {
          ctx.waitUntil(handleScheduledMailing(env));
        } catch (error) {
          console.error("Scheduled mailing failed:", error);
        }
        break;
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
        "INSERT INTO NewsCollection (Feed, Category, Title, Link, pubDate, Id, Description, Content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(
          item.feed,
          item.category,
          item.title,
          item.link,
          item.pubDate,
          item.id,
          item.description,
          item.content
        )
        .run();
    }
  } catch (error) {
    console.error("Error occurred while adding to db", error);
    return new Response("Some records failed to insert", { status: 500 });
  }
  return new Response("All records inserted successfully", { status: 200 });
}

async function handleScheduledDeletion(env) {
  // deleting old contents
  try {
    await env.DB.prepare(
      "DELETE FROM NewsCollection WHERE pubDate < datetime('now', '-2 day')"
    ).run();
    console.log("Old records deleted successfully");
  } catch (error) {
    console.error("Error occurred while deleting old records:", error);
  }
}

async function handleScheduledMailing(env) {
  // for scheduled mailing
  const emails = await getUsersMails(env);
  try {
    // select news which are only upto 1 day older.
    const { results } = await env.DB.prepare(
            "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')"
          ).all();

    if (!results || !Array.isArray(results)) {
            throw new Error("No results found or results is not an array");
          }
    // asking ai to select top news
    const newsHeadlines = results.map(r => r.Title).join('\n');
    const rankingResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
            prompt: `From the following news headlines, select up to 10 most important and impactful ones. Just return the line numbers (1-based) separated by commas:\n\n${newsHeadlines}`,
            });
    const selectedIndices = rankingResponse.response
            .split(',')
            .map(n => parseInt(n.trim()) - 1)
            .filter(n => !isNaN(n) && n >= 0 && n < results.length)
            .slice(0, 10);
    // Generate summaries only for selected news and order by priority
    const updatedResult = await Promise.all(
              selectedIndices.map(async (index) => {
              const result = results[index];
              result.Content = await getAISummary(env, result.Content, 3);
              return result;
              })
            );
    
      const emailHtml = generateEmail(updatedResult);
      const emailResponse = await sendEmail(env, emailHtml, emails);

      if (emailResponse && emailResponse.ok) {
        return new Response("Mail sent successfully", { status: 200 });
      } else {
        return new Response("Failed to send mail", { status: 500 });
      }

  } catch (error) {
      console.error("Error occurred while processing results:", error);
      return new Response("Internal Server Error", { status: 500 });
  }
}

async function getAISummary(env, content, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
        prompt: `Write a short comprehensive summary based on the following news article content, don't add any heading or anything, just content is required:\n\n${content}`,
      });
      return response.response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (i + 1))
      ); // Exponential backoff
    }
  }
}