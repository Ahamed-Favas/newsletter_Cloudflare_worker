import { sendEmail } from "./services/mailer";
import { parseFeed } from "./actions/parseRss";
import { sources } from "./feeds/sources";
import { generateEmail } from "./template/template";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      const validUsername = env.HttpUsername;
      const validPassword = env.HttpPassword;

      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        return new Response("Unauthorized", {
          status: 401,
          headers: { "WWW-Authenticate": "Basic" },
        });
      }

      const encodedCredentials = authHeader.replace("Basic ", "");
      const decodedCredentials = atob(encodedCredentials);
      const [username, password] = decodedCredentials.split(":");

      if (username !== validUsername || password !== validPassword) {
        return new Response("Forbidden", { status: 403 });
      }

      const body = await request.json();
      const userEmail = body.user_email;
      const userFeed = body.user_feed;
      if (!userEmail || !userFeed) {
        return new Response("Missing params in request body", { status: 400 });
      }

      if (userFeed === "timesofindia_topstories") {
        try {
          const { results } = await env.DB.prepare(
            "SELECT * FROM NewsCollection WHERE pubDate > datetime('now', '-1 day')"
          ).all();
          if (!results || !Array.isArray(results)) {
            throw new Error("No results found or results is not an array");
          }
          const updatedResult = await Promise.all(
            results.map(async (result) => {
              result.Content = await getAISummary(env, result.Content, 3);
              return result;
            })
          );
          const emailHtml = generateEmail(updatedResult);
          const emailResponse = await sendEmail(env, emailHtml, userEmail);
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
      return new Response("user is validated");
    }
    return new Response("method is not allowed", { status: 405 });
  },

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
    }
  },
};

async function handleScheduledAction(env) {
  // do scheduled task, ie getting content in every 6 hr.
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
  try {
    await env.DB.prepare(
      "DELETE FROM NewsCollection WHERE pubDate < datetime('now', '-2 day')"
    ).run();
    console.log("Old records deleted successfully");
  } catch (error) {
    console.error("Error occurred while deleting old records:", error);
  }
}

async function getAISummary(env, content, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
        prompt: `Write a medium-sized summary (upto 500 words) based on the following news article content, don't add any heading or anything, just content is required:\n\n${content}`,
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
