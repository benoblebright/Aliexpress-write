
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

async function getProductInfo(authClient: any, targetUrl: string): Promise<any | null> {
    try {
        console.log(`[PROXY] Calling Cloud Run for URL: ${targetUrl}`);
        const response = await authClient.request({
            url: CLOUD_RUN_URL,
            method: 'POST',
            data: { target_url: targetUrl },
        });

        // Log the entire response from Cloud Run
        console.log(`[PROXY] Full response from Cloud Run for ${targetUrl}:`, JSON.stringify(response.data, null, 2));

        const responseData = response.data as any;

        if (responseData && Array.isArray(responseData.results) && responseData.results.length > 0) {
            const result = responseData.results[0];
            if (result && result.product_main_image_url && result.product_title) {
                console.log(`[PROXY] Success: Extracted product_main_image_url and product_title for ${targetUrl}`);
                return {
                    product_main_image_url: result.product_main_image_url,
                    product_title: result.product_title
                };
            } else {
                 console.error(`[PROXY] Error: 'product_main_image_url' or 'product_title' missing in result for ${targetUrl}. Result:`, JSON.stringify(result));
                 return null;
            }
        }
        
        console.error(`[PROXY] Error: "results" array is invalid or empty for ${targetUrl}. Response Data:`, JSON.stringify(responseData));
        return null;

    } catch (error: any) {
        console.error(`[PROXY] An unexpected error occurred while fetching info for ${targetUrl}:`, error.message);
        if (error.response) {
            console.error(`[PROXY] Upstream error response data for ${targetUrl}:`, JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}


export async function POST(request: Request) {
  try {
    const { target_urls } = await request.json();

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
      console.error("[PROXY] Invalid request: 'target_urls' is not a valid array.");
      return NextResponse.json({ error: 'target_urls is required and must be an array' }, { status: 400 });
    }

    console.log("[PROXY] Initializing Google Auth client...");
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    console.log("[PROXY] Google Auth client initialized. Fetching product info for URLs:", target_urls);
    
    const productInfoPromises = target_urls.map(url => getProductInfo(client, url));
    const productInfos = await Promise.all(productInfoPromises);

    console.log("[PROXY] Finished fetching all product infos. Responding to client with:", JSON.stringify(productInfos, null, 2));

    // Log which URLs failed, if any
    const failedUrls = target_urls.filter((_, index) => !productInfos[index]);
    if (failedUrls.length > 0) {
        console.warn(`[PROXY] Failed to get complete product info for the following URLs: ${failedUrls.join(', ')}`);
    }

    return NextResponse.json({ productInfos });

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred in the main POST handler:', error);
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
