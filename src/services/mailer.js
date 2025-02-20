export async function sendEmail(env, emailHtml, userEmail) {
    try {
      const today = getTodayDate()
      const domain = env.mailGunDomain;
      const apiKey = env.mailGunAPIKEY;
      const mailFrom = env.mailGunFromAddress;

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`api:${apiKey}`)}`
        },
        body: new URLSearchParams({
          from: mailFrom,
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