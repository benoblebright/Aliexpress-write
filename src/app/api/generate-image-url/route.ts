
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const maxDuration = 300; // 5분 타임아웃

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { target_urls } = requestBody;

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
      console.error("[PROXY] Invalid request: 'target_urls' is not a valid array.");
      return NextResponse.json({ error: 'target_urls is required and must be an array' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    const response = await client.request({
        url: CLOUD_RUN_URL,
        method: 'POST',
        data: { target_urls: target_urls },
    });

    const responseData = response.data as any;

    if (responseData && Array.isArray(responseData.results)) {
        const productInfos = responseData.results.map((result: any) => {
            if (result && result.product_main_image_url && result.product_title) {
                return {
                    product_main_image_url: result.product_main_image_url,
                    product_title: result.product_title,
                    original_url: result.original_url,
                    sale_volume: result.sale_volume,
                };
            }
            return null;
        });

        // Match the results back to the original urls to ensure the order is correct.
        const sortedProductInfos = target_urls.map(originalUrl => {
            return productInfos.find(info => info && info.original_url === originalUrl) || null;
        });
        
        return NextResponse.json({ productInfos: sortedProductInfos });
    } else {
        console.error(`[PROXY] Error: "results" array is invalid or empty. Response Data:`, JSON.stringify(responseData));
        return NextResponse.json({ error: 'Invalid response structure from Cloud Run service' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred. Request Body:', JSON.stringify(requestBody, null, 2));
    console.error('[PROXY] Error Message:', error.message);
    if (error.response) {
        console.error(`[PROXY] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
         return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
