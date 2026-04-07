export type SearchResult = {
    videoId: string;
    title: string;
    description: string;
    url: string;
    thumbnail?: string;
    duration?: string;
    publisher?: string;
    publishedAt?: string;
};

export type SearchPage = {
    items: SearchResult[];
    continuation?: string;
};

function extractVideosFromInitial(data: any): SearchResult[] {
    const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];

    const itemSection = sections.find((s: any) => s?.itemSectionRenderer)?.itemSectionRenderer?.contents ?? [];

    return itemSection
        .filter((item: any) => item.videoRenderer)
        .map((item: any) => {
            const v = item.videoRenderer;
            return {
                videoId: v.videoId,
                title: v.title?.runs?.[0]?.text ?? "No Title",
                description:
                    v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join("") ??
                    v.descriptionSnippet?.runs?.map((r: any) => r.text).join("") ??
                    "No Description",
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                thumbnail: v.thumbnail?.thumbnails?.at(-1)?.url,
                duration: v.lengthText?.simpleText,
                publisher: v.ownerText?.runs?.[0]?.text ?? v.shortBylineText?.runs?.[0]?.text,
                publishedAt: v.publishedTimeText?.simpleText
            };
        });
}

function extractContinuationFromInitial(data: any): string | undefined {
    const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];

    for (const section of sections) {
        // Option 1: Inside itemSectionRenderer
        const items = section?.itemSectionRenderer?.contents ?? [];
        for (const item of items) {
            const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
            if (token) return token;
        }

        // Option 2: Direct continuationItemRenderer in the sections list
        const directToken = section?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (directToken) return directToken;
    }

    // Option 3: Standard fallback location
    const fallbackToken = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.continuations?.[0]
        ?.nextContinuationData?.continuation;

    if (fallbackToken) return fallbackToken;

    // Option 4: Alternative deeper fallback
    const secondaryFallback = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.at(-1)
        ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

    return secondaryFallback;
}

function extractVideosFromContinuation(data: any): SearchResult[] {
    const actions = data?.onResponseReceivedCommands ?? data?.onResponseReceivedActions ?? [];
    const continuationItems = actions
        .flatMap((a: any) =>
            a?.appendContinuationItemsAction?.continuationItems ??
            a?.reloadContinuationItemsCommand?.continuationItems ??
            []
        )
        .filter(Boolean);

    return continuationItems
        .filter((item: any) => item.videoRenderer)
        .map((item: any) => {
            const v = item.videoRenderer;
            return {
                videoId: v.videoId,
                title: v.title?.runs?.[0]?.text ?? "No Title",
                description:
                    v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join("") ??
                    v.descriptionSnippet?.runs?.map((r: any) => r.text).join("") ??
                    "No Description",
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                thumbnail: v.thumbnail?.thumbnails?.at(-1)?.url,
                duration: v.lengthText?.simpleText,
                publisher: v.ownerText?.runs?.[0]?.text ?? v.shortBylineText?.runs?.[0]?.text,
                publishedAt: v.publishedTimeText?.simpleText
            };
        });
}

function extractContinuationFromContinuation(data: any): string | undefined {
    const actions = data?.onResponseReceivedCommands ?? data?.onResponseReceivedActions ?? [];
    const continuationItems = actions
        .flatMap((a: any) =>
            a?.appendContinuationItemsAction?.continuationItems ??
            a?.reloadContinuationItemsCommand?.continuationItems ??
            []
        )
        .filter(Boolean);

    for (const item of continuationItems) {
        // Option 1: Direct token in continuationItemRenderer
        const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (token) return token;

        // Option 2: Some structures have it deeper or slightly different
        const otherToken = item?.continuationItemRenderer?.continuationEndpoint?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (otherToken) return otherToken;
    }

    // Option 3: Check explicitly in the last item if it's a continuation renderer but not caught by flatMap
    const lastItem = continuationItems.at(-1);
    const lastToken = lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (lastToken) return lastToken;

    return undefined;
}

class Services {
    static async getCredentials() {
        try {
            const response = await fetch('https://www.youtube.com', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = await response.text();
            const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
            const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
            return apiKey;
        } catch (error) {
            console.error('Error fetching credentials:', error);
            return null;
        }
    }

    static async getVideoDetails(videoId: string, apiKey: string) {
        try {
            const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            hl: 'en',
                            gl: 'US',
                            clientName: 'WEB',
                            clientVersion: '2.20210622.10.00'
                        }
                    },
                    videoId: videoId
                })
            });

            const data = await response.json();

            const streamingData = data.streamingData;
            const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            const videoDetails = data.videoDetails;
            console.log(captions)
            return {
                videoDetails,
                streamingData,
                captions
            };
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    static async getCaptionContent(url: string) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            return text;
        } catch (error) {
            console.error('Error fetching caption content:', error);
            return null;
        }
    }

    static async searchVideos(query: string, apiKey: string): Promise<SearchPage> {
        try {
            const response = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            hl: 'en',
                            gl: 'US',
                            clientName: 'WEB',
                            clientVersion: '2.20210622.10.00'
                        }
                    },
                    query: query
                })
            });

            const data = await response.json();
            const items = extractVideosFromInitial(data);
            const continuation = extractContinuationFromInitial(data);

            console.log(`[Services] searchVideos: items=${items.length}, hasToken=${!!continuation}`);

            return {
                items: items,
                continuation: continuation
            };
        } catch (error) {
            console.error('Error searching videos:', error);
            return { items: [] };
        }
    }

    static async searchVideosNext(continuation: string, apiKey: string): Promise<SearchPage> {
        try {
            const response = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                body: JSON.stringify({
                    context: {
                        client: {
                            hl: 'en',
                            gl: 'US',
                            clientName: 'WEB',
                            clientVersion: '2.20210622.10.00'
                        }
                    },
                    continuation
                })
            });

            const data = await response.json();
            const items = extractVideosFromContinuation(data);
            const nextContinuation = extractContinuationFromContinuation(data);

            console.log(`[Services] searchVideosNext: items=${items.length}, hasToken=${!!nextContinuation}`);

            return {
                items: items,
                continuation: nextContinuation
            };
        } catch (error) {
            console.error('Error searching videos next:', error);
            return { items: [] };
        }
    }
}

export default Services