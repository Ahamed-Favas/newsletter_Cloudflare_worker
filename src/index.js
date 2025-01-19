import { sendEmail } from "./services/mailer";
import { parseFeed } from "./actions/parseRss";

const url = ""
export default {
  async fetch(request, env, ctx) {
    return new Response("Worker is running. Scheduled tasks will run automatically.");
  },

  async scheduled(event, env, ctx) {
    console.log("Running scheduled task at:", event.cron);
    try {
      ctx.waitUntil(handleScheduledTask(env));
    } catch (error) {
      console.error("Scheduled task failed:", error);
    }
  }
};

async function handleScheduledTask(env) {
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
    const feedContent =  await parseFeed();
    const emailHtml = await generateEmail(feedContent);
    const emailResponse = await sendEmail(emailHtml);

    return emailResponse && emailResponse.ok;
  } catch (error) {
    console.error("Task execution failed:", error);
    return false;
  }
}