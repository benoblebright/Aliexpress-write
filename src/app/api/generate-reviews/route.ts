
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-reviews-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { target_urls } = requestBody;

    if (!target_urls || !Array.isArray(target_urls) || target_urls.length === 0) {
      return NextResponse.json({ error: 'target_urls is required and must be a non-empty array' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: { target_urls },
    });

    return NextResponse.json(response.data, { status: response.status });

  } catch (error: any) {
    console.error(`[PROXY-REVIEWS] An unexpected error occurred. Request Body:`, JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-REVIEWS] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-REVIEWS] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.' },
      { status: 500 }
    );
  }
}
