import { DOMParser } from 'xmldom';

function parseDate(dateStr) {
    const currDateTime = new Date().toISOString();
    if (!dateStr) return currDateTime;
    const dateTime = new Date(dateStr);
    return isNaN(dateTime.getTime()) ? currDateTime : dateTime.toISOString();
}

async function getAllLinks(env) {
    // Gets article links which scraped so far
    const allLinks = []
    const { results } = (await env.DB.prepare("SELECT Link FROM NewsCollection").all());
    results.forEach(row => allLinks.push(row.Link));
    return allLinks;
}

async function fetchUrl(url, env) {
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
    const allItems = []
    for (const source of sources) {
        const items = await processSource(source, env).catch(error => {
            console.error(`Error processing ${source.url}:`, error);
            return [];
        });
        allItems.push(...items);
    }
    return allItems;
}

async function processSource(source, env) {
    let items = [];
    const feedName = source.name;
    const url = source.url;
    const category = source.category;
    try {
        const response = await fetchUrl(url, env);
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        // Check for RSS
        if (xmlDoc.getElementsByTagName("rss").length) {
            items = Array.from(xmlDoc.getElementsByTagName("item")).map(item => {
                const pubDateStr = item.getElementsByTagName("pubDate")[0]?.textContent || 
                                item.getElementsByTagName("dc:date")[0]?.textContent;
                const link = item.getElementsByTagName("link")[0]?.textContent;
                if (!link) return null;
                
                const description = item.getElementsByTagName("description")[0]?.textContent || item.getElementsByTagName("summary")[0]?.textContent;
                if (!description) return null

                const enclosure = item.getElementsByTagName("enclosure")[0];
                let imageUrl = enclosure && enclosure.getAttribute("type")?.startsWith("image/") ?
                    enclosure.getAttribute("url") : null

                return {
                    feed: feedName,
                    category: category,
                    title: item.getElementsByTagName("title")[0]?.textContent || "",
                    link: link,
                    pubDate: parseDate(pubDateStr),
                    id: item.getElementsByTagName("guid")[0]?.textContent,
                    description: description,
                    imageUrl: imageUrl,
                    createdAt: new Date().toISOString()     
                };
            });
        }

        // Check for Atom
        else if (xmlDoc.getElementsByTagName("feed").length) {
            items = Array.from(xmlDoc.getElementsByTagName("entry")).map(item => {
                const links = Array.from(item.getElementsByTagName("link"));
                if (links.length === 0) return null;

                const pubDateStr = item.getElementsByTagName("published")[0]?.textContent || 
                                item.getElementsByTagName("updated")[0]?.textContent;
                
                const description = item.getElementsByTagName("content")[0]?.textContent
                if (!description) return null
                
                const enclosureLink = links.find(link => 
                    link.getAttribute("rel") === "enclosure" && 
                    link.getAttribute("type")?.startsWith("image/")
                );
                let imageUrl = enclosureLink ? enclosureLink.getAttribute("href") : null;

                return {
                    feed: feedName,
                    category: category,
                    title: item.getElementsByTagName("title")[0]?.textContent || "",
                    link: item.getElementsByTagName("link")[0]?.getAttribute("href"),
                    pubDate: parseDate(pubDateStr),
                    id: item.getElementsByTagName("id")[0]?.textContent,
                    description: description,
                    imageUrl: imageUrl,
                    createdAt: new Date().toISOString()
                };
            });
        }
        else {
            throw new Error("Unsupported feed format");
        }
        // keeping items which are not null or undefined
        items = items.filter(item => item !== null && item !== undefined );
        //  to dedupe in item
        const uniqueItemsMap = new Map();
        items.forEach(item => {
        if (!uniqueItemsMap.has(item.link)) {
            uniqueItemsMap.set(item.link, item);
        }
        });
        items = Array.from(uniqueItemsMap.values());
        console.log("Fetched (before deduping with db)", items.length, "items from", feedName);
        //  to dedupe with db
        const allLinks = new Set(await getAllLinks(env));
        items = items.filter(item => !allLinks.has(item.link))
        return items;
    } catch (error) {
        console.error('Feed parsing error:', error);
        return items
    } 
} 



