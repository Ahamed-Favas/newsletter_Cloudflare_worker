function sanitizeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function convertDateTime(str) {
    if (!str) return '';
    return (new Date(str).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: '2-digit', 
        minute:'2-digit'
    }));
}

export function generateEmail(feedsData) {
    const feedHTML = feedsData.map(feed => `
        <article style="margin-bottom: 30px; padding: 20px; background-color: #fff; border: 1px solid #e0e4e8; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <span style="display: inline-block; padding: 4px 10px; background-color: #e8f4fc; color: #3498db; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 10px;">
                ${sanitizeHtml(feed.Category.trim())}
            </span>
            <h2 style="font-size: 20px; color: #2c3e50; margin: 0 0 10px 0; font-weight: 700;">
                ${sanitizeHtml(feed.Title.trim())}
            </h2>
            <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                ${sanitizeHtml(convertDateTime(feed.pubDate.trim()))}
            </div>
            <p style="color: #5a7997; margin-bottom: 15px; font-size: 16px;">
                ${sanitizeHtml(feed.Content.trim())}
            </p>
            ${feed.Link ? `<a href="${sanitizeHtml(feed.Link)}" style="display: inline-block; padding: 8px 20px; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold; transition: background-color 0.3s ease;">Read Original Article</a>` : ''}
        </article>
    `).join('');
    return `
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Newsletter</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'GeistSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(120deg, #f6f9fc, #e9eef5);">
            <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border: 2px solid #dfe7ed; border-radius: 12px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e4e8;">
                    <h1 style="font-size: 26px; color: #2c3e50; margin: 0; font-weight: 700;">Daily Newsletter</h1>
                </div>
                <div style="padding: 20px 0;">
                    ${feedHTML}
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e4e8;">
                    <p>You're receiving this email because you subscribed to newsletter@pastpricing.com.</p>
                </div>
            </div>
        </body>
        </html>`;
}
