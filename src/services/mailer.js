export async function sendEmail(env, emailHtml, emails) {
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
          to: emails,
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

function getTodayDate() {
  const currDate = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric"
  };
  // @ts-ignore
  return currDate.toLocaleDateString("en-IN", options);
}