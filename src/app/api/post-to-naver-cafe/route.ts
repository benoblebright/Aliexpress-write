
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://navercafe-write-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { subject, content, image_urls, club_id, menu_id } = requestBody;

    if (!subject || !content || !club_id || !menu_id) {
      return NextResponse.json({ error: 'subject, content, club_id, menu_id are required' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    
    const payload = { subject, content, image_urls, club_id, menu_id };

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: payload,
    });

    return NextResponse.json(response.data, { status: response.status });

  } catch (error: any) {
    console.error(`[PROXY-NAVER-CAFE] An unexpected error occurred. Request Body:`, JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-NAVER-CAFE] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-NAVER-CAFE] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.' },
      { status: 500 }
    );
  }
}

    