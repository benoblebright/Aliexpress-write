
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-kakaotalk-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { kakao_content, kakao_url } = requestBody;

    if (!kakao_content || !kakao_url) {
      return NextResponse.json({ error: 'kakao_content and kakao_url are required' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    
    const payload = { kakao_content, kakao_url };

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: payload,
    });

    return NextResponse.json(response.data, { status: response.status });

  } catch (error: any) {
    console.error(`[PROXY-KAKAO] An unexpected error occurred. Request Body:`, JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-KAKAO] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-KAKAO] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.' },
      { status: 500 }
    );
  }
}
