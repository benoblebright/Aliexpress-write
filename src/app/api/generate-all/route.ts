
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const maxDuration = 300; // 5분 타임아웃

const CLOUD_RUN_URL = 'https://alihelper-allimage-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { target_urls, aff_short_key } = requestBody;

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
      return NextResponse.json({ error: 'target_urls is required and must be an array' }, { status: 400 });
    }
    if (!Array.isArray(aff_short_key) || aff_short_key.length === 0) {
      return NextResponse.json({ error: 'aff_short_key is required and must be an array' }, { status: 400 });
    }
     if (target_urls.length !== aff_short_key.length) {
      return NextResponse.json({ error: 'target_urls and aff_short_key must have the same length' }, { status: 400 });
    }


    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: { target_urls, aff_short_key },
    });

    const responseData = response.data as any;
    
    if (responseData && Array.isArray(responseData.results)) {
        // The results might not be in the same order as the request.
        // Match them back to the original urls to ensure order.
        const sortedInfos = target_urls.map(originalUrl => {
            return responseData.results.find((info: any) => info && info.original_url === originalUrl) || null;
        });
        return NextResponse.json({ allInfos: sortedInfos });
    } else {
       console.error(`[PROXY-ALL] Error: Invalid response structure. Expected a 'results' array. Response Data:`, JSON.stringify(responseData, null, 2));
      return NextResponse.json({ error: 'Invalid response structure from the main Cloud Run service' }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[PROXY-ALL] An unexpected error occurred. Request Body:`, JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-ALL] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-ALL] Upstream error response status:`, error.response.status);
      console.error(`[PROXY-ALL] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.' },
      { status: 500 }
    );
  }
}
