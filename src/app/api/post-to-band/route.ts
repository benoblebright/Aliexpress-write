
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-band-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { content, image_url } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    
    const payload: { content: string; image_url?: string } = { content };
    if (image_url) {
        payload.image_url = image_url;
    }

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: payload,
    });

    return NextResponse.json(response.data, { status: response.status });

  } catch (error: any) {
    console.error('[PROXY-BAND] An unexpected error occurred:', error.message);
    if (error.response) {
      console.error(`[PROXY-BAND] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json(error.response.data, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.' },
      { status: 500 }
    );
  }
}
