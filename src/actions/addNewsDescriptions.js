export async function addNewsDescriptions(topNews, env) {
    const startJobApi = env.awsAddJobApi;
    const jobStatusApi = env.awsJobStatusApi;
    const ApiKey = env.awsApiKey;

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
            const payload = { news: newsItems };

            const startJobResponse = await fetchAPI(startJobApi, ApiKey, payload)
            // getting jobId
            const { jobId } = startJobResponse;
            if (!jobId) {
                console.warn("Job id is not returned from startJobApi")
                throw new Error("Job id is not returned from startJobApi")
            }

            let jobStatusResponse = null;
            const maxAttempts = 3;  //  defining maximum attempts for aws

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                // waits for one min between each polling
                await new Promise(resolve => setTimeout(resolve, 60000));
                // after one min
                jobStatusResponse = await fetchJobStatus(jobStatusApi, ApiKey, jobId);

                if (jobStatusResponse.status === "failed") {
                    console.warn("lambda newsletter_process failed")
                    throw new Error("lambda newsletter_process failed")
                }

                if (jobStatusResponse.status === "completed") {
                    break;
                }
            }

            if ( jobStatusResponse && jobStatusResponse.status === "completed" && jobStatusResponse.result && Array.isArray(jobStatusResponse.result.summaries) ) {
                    for (const item of jobStatusResponse.result.summaries) {
                    const { category, indexStr, description } = item;
                    const index = parseInt(indexStr, 10);
                    if ( topNews[category] && topNews[category][index] ) {
                        topNews[category][index].Description = description;
                    }
                }
            }
            else {
                console.warn("Job did not complete within the expected time.");
            }
        } catch (error) {
            console.warn("Failed to fetch summaries", error)
            throw new Error("Failed to fetch summaries")
        }
    }
    return topNews;
}

async function fetchAPI(url, key, payload) {
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
            body: JSON.stringify(payload)
        });
    } finally {
        clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
        console.log(`Failed to fetch startJob lambda: ${response.status}`);
        throw new Error(`Failed to fetch startJob lambda: ${response.status}`);
    }

    return await response.json();
}

async function fetchJobStatus(url, key, jobId) {
    const queryUrl = `${url}?jobId=${encodeURIComponent(jobId)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
        response = await fetch(queryUrl, {
            signal: controller.signal,
            method: "GET",
            headers: {
                'x-api-key': key,
                'Content-Type': 'application/json'
            }
        });
    } finally {
        clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
        console.log(`Failed to fetch jobStatus lambda: ${response.status}`);
        throw new Error(`Failed to fetch jobStatus lambda: ${response.status}`);
    }
    
    const jobResponse =  await response.json();
    if (jobResponse.result) {
        jobResponse.result = JSON.parse(jobResponse.result);
    }
    return jobResponse
}