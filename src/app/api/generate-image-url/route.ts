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

        // Cloud Run's response is wrapped in a data object.
        // The actual payload we want is response.data
        const responseData = response.data as any;

        if (responseData && Array.isArray(responseData.results) && responseData.results.length > 0) {
            const result = responseData.results[0];
            if(result && result.product_main_image_url && result.product_title) {
                 console.log(`[PROXY] Success for ${targetUrl}:`, JSON.stringify(result));
                return {
                    product_main_image_url: result.product_main_image_url,
                    product_title: result.product_title
                };
            }
        }
        
        console.error(`[PROXY] Error: "results" not found or invalid for ${targetUrl}. Response:`, responseData);
        return null;

    } catch (error: any) {
        console.error(`[PROXY] An unexpected error occurred for ${targetUrl}:`, error);
        if (error.response) {
            console.error(`[PROXY] Error response from upstream for ${targetUrl}:`, JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}


export async function POST(request: Request) {
  try {
    const { target_urls } = await request.json();

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
      return NextResponse.json({ error: 'target_urls is required and must be an array' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    
    // Call getProductInfo for each URL in parallel
    const productInfoPromises = target_urls.map(url => getProductInfo(client, url));
    const productInfos = await Promise.all(productInfoPromises);

    // Log which URLs failed, if any
    const failedUrls = target_urls.filter((_, index) => !productInfos[index]);
    if (failedUrls.length > 0) {
        console.warn(`[PROXY] Failed to fetch product info for: ${failedUrls.join(', ')}`);
    }

    // Return the array of results (which may contain nulls)
    return NextResponse.json({ productInfos });

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred in POST handler:', error);
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
