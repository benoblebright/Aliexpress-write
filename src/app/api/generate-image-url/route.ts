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

        if (response && response.data && Array.isArray((response.data as any).results)) {
            const result = (response.data as any).results[0];
            if(result && result.product_main_image_url && result.product_title) {
                 console.log(`[PROXY] Success for ${targetUrl}:`, JSON.stringify(result));
                return {
                    product_main_image_url: result.product_main_image_url,
                    product_title: result.product_title
                };
            }
        }
        
        console.error(`[PROXY] Error: "results" not found or invalid for ${targetUrl}. Response:`, response.data);
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
    
    const productInfoPromises = target_urls.map(url => getProductInfo(client, url));
    const productInfos = await Promise.all(productInfoPromises);

    const failedUrls = target_urls.filter((_, index) => !productInfos[index]);
    if (failedUrls.length > 0) {
        console.warn(`[PROXY] Failed to fetch product info for: ${failedUrls.join(', ')}`);
    }

    return NextResponse.json({ productInfos });

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred in POST handler:', error);
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}

    