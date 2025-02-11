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
    return (new Date(str).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: '2-digit', 
        minute:'2-digit'
    }));
}

export function generateEmail(feedsData, unsubUrl) {
    const feedHTML = feedsData.map(feed => `
        
        <!--[if mso | IE]>
         <table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" >
            <tr>
               <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                  <![endif]-->
                  <div style="margin:0px auto;max-width:600px;">
                     <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                        <tbody>
                           <tr>
                              <td style="direction:ltr;font-size:0px;padding:8px 0;text-align:center;">
                                 <!--[if mso | IE]>
                                 <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                       <td class="" style="vertical-align:top;width:600px;" >
                                          <![endif]-->
                                          <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                                             <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                                <tbody>
                                                   <tr>
                                                      <td style="background-color:#FFFFFE;vertical-align:top;padding:0;">
                                                         <table border="0" cellpadding="0" cellspacing="0" role="presentation" style width="100%">
                                                            <tbody>
                                                               <!-- Category -->
                                                               <tr>
                                                                  <td align="center" class="category-text" style="display: inline-block; border-radius: 8px; margin-top: 6px; margin-left: 6px; background-color: #e8f4fc; color: #3498db; text-align: center; font-size: 0px; padding: 4px 4px; word-break: break-word;" bgcolor="#e8f4fc">
                                                                     <div style="font-family: 'Inter', sans-serif;font-size:13px;line-height:1;text-align:center;color:#000000;">${sanitizeHtml(feed?.Category?.trim())}</div>
                                                                  </td>
                                                               </tr>
                                                               <!-- Title -->
                                                               <tr>
                                                                  <td align="center" style="font-size:0px;padding:2px 0;word-break:break-word;">
                                                                     <div style="font-family: 'Inter', sans-serif;font-size:20px;font-weight:bold;line-height:1;text-align:center;color:#000000;">${sanitizeHtml(feed?.Title?.trim())}</div>
                                                                  </td>
                                                               </tr>
                                                               <!-- Date -->
                                                               <tr>
                                                                  <td align="center" style="font-size:0px;padding:2px 0;word-break:break-word;">
                                                                     <div style="font-family: 'Inter', sans-serif;font-size:12px;line-height:1;text-align:center;color:#999999;">${sanitizeHtml(convertDateTime(feed?.pubDate?.trim()))}</div>
                                                                  </td>
                                                               </tr>
                                                               <!-- Image -->
                                                               ${feed?.ImageUrl?.trim() ? `
                                                               <tr>
                                                                  <td align="center" class="news-image" style="font-size:0px;padding:0;word-break:break-word;">
                                                                     <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                                                                        <tbody>
                                                                           <tr>
                                                                              <td style="width:600px;">
                                                                                 <img alt="news image" height="auto" src=${feed?.ImageUrl?.trim()} style="max-height: 300px; object-fit: contain; box-shadow: 0px 2px 6px rgba(0,0,0,0.15); border: 0; display: block; outline: none; text-decoration: none; font-size: 13px; width: 100%; height: auto;" width="600">
                                                                              </td>
                                                                           </tr>
                                                                        </tbody>
                                                                     </table>
                                                                  </td>
                                                               </tr>`: ``}
                                                               <!-- Summary -->
                                                               <tr>
                                                                  <td align="left" style="font-size:0px;padding:6px 6px;word-break:break-word;">
                                                                     <div style="font-family: 'Inter', sans-serif;font-size:14px;line-height:120%;text-align:left;color:#000000;">${sanitizeHtml(feed?.Description?.trim())}</div>
                                                                  </td>
                                                               </tr>
                                                               <!-- Read More Link -->
                                                               <tr>
                                                                  <td align="left" class="read-more" style="font-size:0px;padding:6px 6px;word-break:break-word;">
                                                                     <div style="font-family: 'Inter', sans-serif;font-size:13px;line-height:1;text-align:left;color:#000000;"><a href=${feed?.Link?.trim()} style="text-decoration: underline; color: #3498db;">Read here...</a></div>
                                                                  </td>
                                                               </tr>
                                                            </tbody>
                                                         </table>
                                                      </td>
                                                   </tr>
                                                </tbody>
                                             </table>
                                          </div>
                                          <!--[if mso | IE]>
                                       </td>
                                    </tr>
                                 </table>
                                 <![endif]-->
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
                  <!--[if mso | IE]>
               </td>
            </tr>
         </table>
         <![endif]-->

        `).join('');

     return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <title>
        </title>
        <!--[if !mso]><!-->
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <!--<![endif]-->
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style type="text/css">
            #outlook a { padding:0; }
            body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
            table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
            img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
            p { display:block;margin:13px 0; }
        </style>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
        <!--[if lte mso 11]>
        <style type="text/css">
            .mj-outlook-group-fix { width:100% !important; }
        </style>
        <![endif]-->
        <!--[if !mso]><!-->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <style type="text/css">
            @import url(https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap);
        </style>
        <!--<![endif]-->
        <style type="text/css">
            @media only screen and (min-width:480px) {
            .mj-column-per-100 { width:100% !important; max-width: 100%; }
            }
        </style>
        <style media="screen and (min-width:480px)">
            .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
        </style>
        <style type="text/css">
            @media only screen and (max-width:480px) {
            table.mj-full-width-mobile { width: 100% !important; }
            td.mj-full-width-mobile { width: auto !important; }
            }
        </style>
        <style type="text/css">
        </style>
    </head>
    <body style="word-spacing:normal;">
        <div>
            <!-- Header -->
            <!--[if mso | IE]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" >
                <tr>
                <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                    <![endif]-->
                    <div style="margin:0px auto;max-width:600px;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                            <tr>
                                <td style="direction:ltr;font-size:0px;padding:10px 0;text-align:center;">
                                    <!--[if mso | IE]>
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                        <td class="" style="vertical-align:top;width:600px;" >
                                            <![endif]-->
                                            <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                                                    <tbody>
                                                    <tr>
                                                        <td align="center" style="font-size:0px;padding:10;word-break:break-word;">
                                                            <div style="font-family: 'Inter', sans-serif;font-size:24px;line-height:120%;text-align:center;color:#000000;"><strong>Daily Newsletter</strong></div>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <!--[if mso | IE]>
                                        </td>
                                        </tr>
                                    </table>
                                    <![endif]-->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <!--[if mso | IE]>
                </td>
                </tr>
            </table>
            <![endif]-->
            <!-- News Sections  -->
                ${feedHTML}
            <!-- Footer / Unsubscribe -->
            <!--[if mso | IE]>
            <table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" >
                <tr>
                <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
                    <![endif]-->
                    <div style="margin:0px auto;max-width:600px;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                            <tbody>
                            <tr>
                                <td style="direction:ltr;font-size:0px;padding:10px 0;text-align:center;">
                                    <!--[if mso | IE]>
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                        <td class="" style="vertical-align:top;width:600px;" >
                                            <![endif]-->
                                            <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                                                    <tbody>
                                                    <tr>
                                                        <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                                                            <div style="font-family: 'Inter', sans-serif;font-size:14px;line-height:20px;text-align:center;color:#000000;">You're receiving this email because you subscribed to newsletter at <strong>newsletter@pastpricing.com</strong>. If you'd like to unsubscribe, <a href=${unsubUrl?.trim()} style="text-decoration:none; color:#0000EE;">Click here</a>.</div>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <!--[if mso | IE]>
                                        </td>
                                        </tr>
                                    </table>
                                    <![endif]-->
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <!--[if mso | IE]>
                </td>
                </tr>
            </table>
            <![endif]-->
        </div>
    </body>
    </html>

    `
}