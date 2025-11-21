
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const maxDuration = 300; // 5분 타임아웃

const CLOUD_RUN_URL = 'https://alihelper-reviews-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { target_urls } = requestBody;

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
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
    
    // The review API returns an array directly
    if (responseData && Array.isArray(responseData)) {
      // The result from this specific cloud function is already an array of objects.
      // We just need to match it to the original URLs.
      const sortedReviewInfos = target_urls.map(originalUrl => {
        return responseData.find(review => review && review.source_url === originalUrl) || null;
      });
      return NextResponse.json({ reviewInfos: sortedReviewInfos });
    } else {
       console.error(`[PROXY-REVIEWS] Error: Invalid response structure. Expected an array. Response Data:`, JSON.stringify(responseData));
      return NextResponse.json({ error: 'Invalid response structure from reviews Cloud Run service' }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[PROXY-REVIEWS] An unexpected error occurred. Request Body:`, JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-REVIEWS] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-REVIEWS] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the reviews proxy.' },
      { status: 500 }
    );
  }
}
