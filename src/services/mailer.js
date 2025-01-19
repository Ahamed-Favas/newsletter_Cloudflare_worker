export async function sendEmail(emailHtml) {
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
          subject: "Good Morning!",
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