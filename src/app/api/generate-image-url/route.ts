import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

async function getImageUrl(authClient: any, targetUrl: string): Promise<string | null> {
    try {
        console.log(`[PROXY] Calling Cloud Run for URL: ${targetUrl}`);
        const response = await authClient.request({
            url: CLOUD_RUN_URL,
            method: 'POST',
            data: { target_url: targetUrl },
        });

        if (response && response.data && typeof response.data === 'object') {
            const responseData = response.data as { product_main_image_url?: string };
            console.log(`[PROXY] Response for ${targetUrl}:`, JSON.stringify(responseData, null, 2));

            if (responseData.product_main_image_url) {
                return responseData.product_main_image_url;
            }
        }
        console.error(`[PROXY] Error: "product_main_image_url" not found for ${targetUrl}. Response:`, response.data);
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
    
    const imageUrlPromises = target_urls.map(url => getImageUrl(client, url));
    const imageUrls = await Promise.all(imageUrlPromises);

    const failedUrls = target_urls.filter((_, index) => !imageUrls[index]);
    if (failedUrls.length > 0) {
        console.warn(`[PROXY] Failed to fetch image URLs for: ${failedUrls.join(', ')}`);
    }

    return NextResponse.json({ imageUrls });

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred in POST handler:', error);
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
