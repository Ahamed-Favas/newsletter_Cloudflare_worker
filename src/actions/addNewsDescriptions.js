import { DOMParser } from 'xmldom';

export async function addNewsDescriptions(topNews, env) {
    const BedrockApi = env.BedrockApi;
    const BedrockApiKey = env.BedrockApiKey;
    const parser = new DOMParser();

    for (const category of Object.keys(topNews)) {
        const newsList = topNews[category];

        for (let i = 0; i < newsList.length; i++) {
            const news = newsList[i];

            if (!news.Description) {
                try {
                    const url = news.Link;
                    const contentClass = news.contentClass;
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    let response;
                    try {
                        response = await fetch(url, { 
                            signal: controller.signal,
                            headers: {
                                'User-Agent': 'RSS Digest Bot/1.0'
                            }
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    
                    if (!response.ok) {
                        console.warn(`Failed to fetch content for URL: ${url}`);
                        continue;
                    }

                    const html = await response.text();
                    const doc = parser.parseFromString(html, 'text/html');
                    const contentElements = Array.from(doc.getElementsByClassName(contentClass));
                    
                    if (contentElements.length > 0) {
                        const firstElement = contentElements[0];
                        const content = firstElement?.textContent?.trim();
                        
                        if (content) {
                            // Ask the AI for a summary
                            try {
                                const prompt = `Create a very short summary (2-3 sentences) of the following news content:\n\n${content}`;
                                const BedRockResponse = await fetchAPI(BedrockApi, BedrockApiKey, prompt);
                                if (BedRockResponse?.response) {
                                    topNews[category][i].Description = BedRockResponse.response.trim();
                                }
                            } catch (aiError) {
                                console.warn(`Failed to generate AI summary for news: ${news.Link}`, aiError);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Error processing news item: ${news.Link}`, error);
                    // If an error occurs, keep the original (missing) description
                    continue;
                }
            }
        }
    }
    
    return topNews;
}


async function fetchAPI(url, key, prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
        response = await fetch(url, { 
            signal: controller.signal,
            method: "POST",
            headers: {
                'x-api-key': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
    } finally {
        clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
        console.log(`Failed to fetch feed: ${response.status}`);
        throw new Error(`Failed to fetch feed: ${response.status}`);
    }
    
    const BedRockResponse = await response.json();
    return BedRockResponse;
}
