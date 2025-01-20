import { sendEmail } from "./services/mailer";
import { parseFeed } from "./actions/parseRss";

const timesofindia_topstories = "https://timesofindia.indiatimes.com/rssfeedstopstories.cms";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      const validUsername = env.HttpUsername;
      const validPassword = env.HttpPassword;

      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith("Basic ")) {
          return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic" } });
      }

      const encodedCredentials = authHeader.replace("Basic ", "");
      const decodedCredentials = atob(encodedCredentials);
      const [username, password] = decodedCredentials.split(':');

      if (username !== validUsername || password !== validPassword) {
      return new Response("Forbidden", { status: 403 });
      }
      const body = await request.json();
      const userEmail = body.user_email;
      const userFeed = body.user_feed;
      if (!userEmail || !userFeed) {
        return new Response("Missing params in request body", { status: 400 });
      }
      if ( userFeed === "timesofindia_topstories" ) {
        // Task to do mailing, after fetching from db and done processing by ai 
      }
    return new Response("user is validated")
    }
    return new Response("method is not allowed", { status: 405 })
  },

  async scheduled(event, env, ctx) {
    console.log("Running scheduled task at:", event.cron);
    switch(event.cron) {
      case "0 */6 * * *":
        try {
          ctx.waitUntil(handleScheduledTask(env));
        } catch (error) {
          console.error("Scheduled task failed:", error);
        }
        break;
      case "0 0 */3 * *":
        try {
          // do scheduled deletion of d1 db
        } catch (error) {
          console.error("Scheduled task failed:", error);
        }
        break;
    }
  }
};

async function handleScheduledTask(env) {
  // do scheduled task, ie getting content in every 6 hr.
  // async function getGoodMorningMessage(retries = 3) {
    
  //   for (let i = 0; i < retries; i++) {
  //     try {
  //       const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  //         prompt: 'Write a 500-word essay about hello world.'
  //       });
  //       return response.response;
  //     } catch (error) {
  //       console.error(`Attempt ${i + 1} failed:`, error);
  //       if (i === retries - 1) throw error;
  //       await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
  //     }
  //   }
  // }

  try {
    // const goodMorningMessage = await getGoodMorningMessage();
    const feedContent =  await parseFeed([timesofindia_topstories], env);
    const emailHtml = await generateEmail(feedContent);
    const emailResponse = await sendEmail(emailHtml);

    return emailResponse && emailResponse.ok;
  } catch (error) {
    console.error("Task execution failed:", error);
    return false;
  }
  return
}