export async function sendEmail(env, emailHtml, userEmail) {
    try {
      const today = getTodayDate()
      const response = await fetch(`https://api.mailgun.net/v3/${env.mailGunDomain}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`api:${env.mailGunAPIKEY}`)}`
        },
        body: new URLSearchParams({
          from: env.mailGunFromAddress,
          to: userEmail,
          subject: `Good Morning! Today is ${today}`,
          html: emailHtml,
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mailgun API responded with status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
}

export function getTodayDate() {
  const currDate = new Date()
  return currDate.toLocaleDateString(
    undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    })
}