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

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: { target_url },
    });

    if (response.status !== 200) {
        console.error(`External API error: Status ${response.status}`, response.data);
        return NextResponse.json({ error: `Failed to fetch image URL. Status: ${response.status}.`, details: response.data }, { status: response.status });
    }

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Proxy API error:', error.message, error.stack, error.response?.data);
    return NextResponse.json({ error: 'An internal server error occurred.', details: error.message }, { status: 500 });
  }
}
