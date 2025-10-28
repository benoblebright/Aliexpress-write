import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    // Explicitly configure GoogleAuth.
    // In App Hosting, GOOGLE_APPLICATION_CREDENTIALS is a path to a credentials file.
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    
    // Get an ID token client that can sign requests.
    // The audience is the URL of the receiving Cloud Run service.
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);
    
    // Make an authenticated request to the Cloud Run service
    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { target_url },
    });


    if (response.status !== 200) {
      console.error(`External API error: ${response.status}`, response.data);
      return NextResponse.json({ error: `Failed to fetch image URL. Status: ${response.status}` }, { status: response.status });
    }

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Proxy API error:', error.response?.data || error.message, error.stack);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
