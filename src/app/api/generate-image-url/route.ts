import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    // Initialize Google Auth client
    // By default, it will use the application's service account credentials
    // when running on Google Cloud infrastructure like App Hosting.
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    // Make an authenticated request to the Cloud Run service.
    const response = await client.request({
        url: CLOUD_RUN_URL,
        method: 'POST',
        data: { target_url },
    });
    
    // The actual data from the response is in the `data` property.
    return NextResponse.json(response.data);

  } catch (error: any) {
    // Log the full error to the server console for debugging.
    console.error('Proxy API error:', error);
    
    // Return a generic error message to the client.
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'An internal server error occurred in the proxy.';
    
    return NextResponse.json(
        { error: message }, 
        { status: status }
    );
  }
}
