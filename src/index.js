/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
    async fetch(response, env, ctx) {
  async function sendEmail(textToSend) {
    try {
        const response = await fetch(`https://api.mailgun.net/v3/${env.mailGunDomain}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${btoa(`api:${env.mailGunAPIKEY}`)}`
            },
            body: new URLSearchParams({
                from: env.mailGunFromAddress,
                to: env.mailGunToAddress,
                subject: "Your Website is Offline",
                text: textToSend
            })
        });
        return response;
    } catch (error) {
        return false;
    }
	}
	const resp = await sendEmail("Helllllo");
    return new Response(await resp.text())    
	},
}
