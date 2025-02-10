export async function addNewsDescriptions(topNews, env) {
    const BedrockApi = env.BedrockApi;
    const BedrockApiKey = env.BedrockApiKey;

    const newsItems = [];
    
    for (const category of Object.keys(topNews)) {
        const newsList = topNews[category];

        for (let i = 0; i < newsList.length; i++) {
            const news = newsList[i];

            if (!news.Description) {
                newsItems.push({
                    Link: news.Link,
                    contentClass: news.contentClass,
                    category,
                    index: i
                });
            }
        }
    }

    if ( newsItems.length > 0 ) {
        try {
            const payload = { news: newsItems }
            const lambdaResponse = await fetchAPI(BedrockApi, BedrockApiKey, payload);

            if ( lambdaResponse && Array.isArray(lambdaResponse.summaries )) {
                for (const item of lambdaResponse.summaries) {
                    const { category, indexStr, description } = item;

                    // const [category, indexStr] = id.split('-');
                    const index = parseInt(indexStr, 10);
                    if ( topNews[category] && topNews[category][index] ) {
                        topNews[category][index].Description = description;
                    }
                }
            }
        } catch (error) {
            console.warn("Failed to fetch summaries from Lambda", error)
        }
    }
    return topNews;
}

async function fetchAPI(url, key, payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    let response;
    try {
        response = await fetch(url, { 
            signal: controller.signal,
            method: "POST",
            headers: {
                'x-api-key': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } finally {
        clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
        console.log(`Failed to fetch feed from lambda: ${response.status}`);
        throw new Error(`Failed to fetch feed from lambda: ${response.status}`);
    }

    return await response.json();
}
