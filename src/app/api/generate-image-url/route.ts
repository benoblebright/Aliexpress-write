import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    // Initialize Google Auth client. It will automatically find the
    // application default credentials in the App Hosting environment.
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    // Make an authenticated request to the Cloud Run service.
    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: { target_url },
    });

    // The actual response data is in the `data` property of the response object.
    // Return this data directly.
    return NextResponse.json(response.data);

  } catch (error: any) {
    // Log the detailed error on the server for debugging.
    console.error('Proxy API error:', error.message, error.stack);
    
    // Provide a clear error message to the client.
    return NextResponse.json(
        { error: 'An internal server error occurred while fetching the image URL.', details: error.message }, 
        { status: 500 }
    );
  }
}
