import { DOMParser } from 'xmldom';

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

export async function parseFeed(urls, env) {
    for (const url in urls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'User-Agent': 'RSS Digest Bot/1.0'  // Some feeds require User-Agent
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch feed: ${response.status}`);
            }
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");

            // Check for RSS
            if (xmlDoc.getElementsByTagName("rss").length) {
                var items = Array.from(xmlDoc.getElementsByTagName("item")).map(item => {
                    const pubDateStr = item.getElementsByTagName("pubDate")[0]?.textContent || 
                                    item.getElementsByTagName("dc:date")[0]?.textContent;
                    return {
                        title: item.getElementsByTagName("title")[0]?.textContent || "No Title",
                        link: item.getElementsByTagName("link")[0]?.textContent,
                        pubDate: parseDate(pubDateStr),
                        guid: item.getElementsByTagName("guid")[0]?.textContent,
                        content: item.getElementsByTagName("description")[0]?.textContent || ""
                    };
                });
            }
            // Check for Atom
            else if (xmlDoc.getElementsByTagName("feed").length) {
                var items = Array.from(xmlDoc.getElementsByTagName("entry")).map(entry => {
                    const pubDateStr = entry.getElementsByTagName("published")[0]?.textContent || 
                                    entry.getElementsByTagName("updated")[0]?.textContent;
                    return {
                        title: entry.getElementsByTagName("title")[0]?.textContent || "No Title",
                        link: entry.getElementsByTagName("link")[0]?.getAttribute("href"),
                        pubDate: parseDate(pubDateStr),
                        id: entry.getElementsByTagName("id")[0]?.textContent,
                        content: entry.getElementsByTagName("content")[0]?.textContent || ""
                    };
                });
            } else {
                throw new Error("Unsupported feed format");
            }

            items = items.filter(item => item.content && item.content.trim() !== "");
            items = items.sort((a, b) => (b.pubDate || new Date(0)) - (a.pubDate || new Date(0))) // filtering and sorting
            return items;

        } catch (error) {
            console.error('Feed parsing error:', error);
            return []; // Return empty array instead of crashing
        }
    }
}

