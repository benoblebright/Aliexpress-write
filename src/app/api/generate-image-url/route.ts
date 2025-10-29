import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    console.log(`[PROXY] Calling Cloud Run service at: ${CLOUD_RUN_URL}`);
    const response = await client.request({
        url: CLOUD_RUN_URL,
        method: 'POST',
        data: { target_url },
    });
    
    console.log('[PROXY] Received response from Cloud Run. Status:', response.status);
    
    if (response && response.data && typeof response.data === 'object') {
        const responseData = response.data as { product_main_image_url?: string };
        console.log('[PROXY] Response data:', JSON.stringify(responseData, null, 2));
        
        const productImageUrl = responseData.product_main_image_url;

        if (productImageUrl) {
            // Map product_main_image_url to imageUrl for the frontend
            return NextResponse.json({ imageUrl: productImageUrl });
        } else {
            console.error('[PROXY] Error: "product_main_image_url" not found in the response from Cloud Run.');
            return NextResponse.json(
                { error: 'Image URL key not found in the response.' }, 
                { status: 502 }
            );
        }
    } else {
        console.error('[PROXY] Error: Response from Cloud Run is missing the "data" property or is not a valid object.');
        console.error('[PROXY] Full response object:', JSON.stringify(response, null, 2));
        return NextResponse.json(
            { error: 'Invalid response from image generation service.' }, 
            { status: 502 }
        );
    }

  } catch (error: any) {
    console.error('[PROXY] An unexpected error occurred:', error);
    
    if (error.response) {
      console.error('[PROXY] Error response from upstream:', JSON.stringify(error.response.data, null, 2));
    }
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'An internal server error occurred in the proxy.';
    
    return NextResponse.json(
        { error: message }, 
        { status: status }
    );
  }
}
