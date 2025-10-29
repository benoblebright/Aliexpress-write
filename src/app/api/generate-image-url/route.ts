
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

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
    console.log("[PROXY] Google Auth client initialized. Calling Cloud Run with URLs:", target_urls);

    const response = await client.request({
        url: CLOUD_RUN_URL,
        method: 'POST',
        data: { target_urls: target_urls },
    });
    
    console.log(`[PROXY] Full response from Cloud Run:`, JSON.stringify(response.data, null, 2));

    const responseData = response.data as any;

    if (responseData && Array.isArray(responseData.results)) {
        const productInfos = responseData.results.map((result: any) => {
            if (result && result.product_main_image_url && result.product_title) {
                return {
                    product_main_image_url: result.product_main_image_url,
                    product_title: result.product_title,
                    original_url: result.original_url
                };
            }
            return null;
        });

        // Match the results back to the original urls
        const sortedProductInfos = target_urls.map(originalUrl => {
            return productInfos.find(info => info && info.original_url === originalUrl) || null;
        });
        
        console.log("[PROXY] Responding to client with:", JSON.stringify(sortedProductInfos, null, 2));
        return NextResponse.json({ productInfos: sortedProductInfos });
    } else {
        console.error(`[PROXY] Error: "results" array is invalid or empty. Response Data:`, JSON.stringify(responseData));
        return NextResponse.json({ error: 'Invalid response structure from Cloud Run service' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred in the main POST handler:', error.message);
    if (error.response) {
        console.error(`[PROXY] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
    }
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
