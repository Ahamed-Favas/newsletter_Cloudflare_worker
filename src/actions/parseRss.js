import { DOMParser } from 'xmldom';

function parseDate(dateStr) {
    const currDateTime = new Date().toISOString();
    if (!dateStr) return currDateTime;
    try {
        const dateTime = new Date(dateStr).toISOString();
        return dateTime;
    } catch {
        return currDateTime;
    }
}

async function getAllLinks(env) {
    // Gets article links which scraped so far
    const allLinks = []
    const { results } = (await env.DB.prepare("SELECT Link FROM NewsCollection").all());
    results.forEach(row => allLinks.push(row.Link));
    return allLinks;
}

async function fetchUrl(url, env, isXml) {
    if (!isXml) { 
        const allLinks = await getAllLinks(env);
        if (allLinks.includes(url)) { 
            return  // To avoid scraping duplicate articles
        } 
    }
    // console.log("called for url", url)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
            'User-Agent': 'RSS Digest Bot/1.0'
        }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
        console.log(`Failed to fetch feed: ${response.status}`)
        throw new Error(`Failed to fetch feed: ${response.status}`);
    }
    return response
}

export async function parseFeed(sources, env) {
    for (const source of sources) {
        let items = [];
        const name = source.name;
        const url = source.url;
        const contentClass = source.contentClass;
        const category = source.category;
        try {
            const response = await fetchUrl(url, env, true);
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");

            // Check for RSS
            if (xmlDoc.getElementsByTagName("rss").length) {
                items = await Promise.all(Array.from(xmlDoc.getElementsByTagName("item")).map(async item => {
                    const pubDateStr = item.getElementsByTagName("pubDate")[0]?.textContent || 
                                    item.getElementsByTagName("dc:date")[0]?.textContent;
                    const link = item.getElementsByTagName("link")[0]?.textContent;
                    if( !link ) return null;
                    const response = await fetchUrl(link, env, false);
                    if (!response) return null;
                    const html = await response.text();
                    const doc = parser.parseFromString(html, 'text/html');
                    const contentElement = Array.from(doc.getElementsByClassName(contentClass));
                    if ( contentElement.length > 0 ) {
                        const firstClass = contentElement[0];
                        const content = firstClass?.textContent;
                        if ( !content ) return null;
                        return {
                            feed: name,
                            category: category,
                            title: item.getElementsByTagName("title")[0]?.textContent || "No Title",
                            link: link,
                            pubDate: parseDate(pubDateStr),
                            id: item.getElementsByTagName("guid")[0]?.textContent,
                            description: item.getElementsByTagName("description")[0]?.textContent || "",
                            content: content
                        };
                    };
                    return null;
                }));
            }
            // Check for Atom
            else if (xmlDoc.getElementsByTagName("feed").length) {
                items = await Promise.all(Array.from(xmlDoc.getElementsByTagName("entry")).map(async entry => {
                    const pubDateStr = entry.getElementsByTagName("published")[0]?.textContent || 
                                    entry.getElementsByTagName("updated")[0]?.textContent;
                    const link = entry.getElementsByTagName("link")[0]?.getAttribute("href");
                    if( !link ) return null;
                    const response = await fetchUrl(link, env, false);
                    if (!response) return null;
                    const html = await response.text();
                    const doc = parser.parseFromString(html, 'text/html');
                    const contentElement = Array.from(doc.getElementsByClassName(contentClass));
                    if ( contentElement.length > 0 ) {
                        const firstClass = contentElement[0];
                        const content = firstClass.textContent;
                        if ( !content ) return null;
                        return {
                            feed: name,
                            category: category,
                            title: entry.getElementsByTagName("title")[0]?.textContent || "No Title",
                            link: link,
                            pubDate: parseDate(pubDateStr),
                            id: entry.getElementsByTagName("id")[0]?.textContent,
                            description: entry.getElementsByTagName("content")[0]?.textContent || "",
                            content: content
                        };
                    };
                    return null;
                }));
            } else {
                throw new Error("Unsupported feed format");
            }

            items = items.filter(item => item !== null && item !== undefined);
            items = items.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.link === item.link
                ))
            );
            return items;

        } catch (error) {
            console.error('Feed parsing error:', error);
            return items;
        }
    }
}

