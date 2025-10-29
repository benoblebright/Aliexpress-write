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

    console.log(`[PROXY] Calling Cloud Run service at: ${CLOUD_RUN_URL}`);
    // Make an authenticated request to the Cloud Run service.
    const response = await client.request({
        url: CLOUD_RUN_URL,
        method: 'POST',
        data: { target_url },
    });
    
    console.log('[PROXY] Received response from Cloud Run. Status:', response.status);
    console.log('[PROXY] Full response object:', JSON.stringify(response, null, 2));

    // The actual data from the response is in the `data` property.
    // It is crucial to check if `response.data` exists and has the expected structure.
    if (response && response.data) {
        console.log('[PROXY] Response data:', JSON.stringify(response.data, null, 2));
        return NextResponse.json(response.data);
    } else {
        console.error('[PROXY] Error: Response from Cloud Run is missing the "data" property or is invalid.');
        return NextResponse.json(
            { error: 'Invalid response from image generation service.' }, 
            { status: 502 } // Bad Gateway, indicates an issue with the upstream service response
        );
    }

  } catch (error: any) {
    // Log the full error to the server console for debugging.
    console.error('[PROXY] An unexpected error occurred:', error);
    
    // Check for specific Google Auth related errors
    if (error.response) {
      console.error('[PROXY] Error response from upstream:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Return a generic error message to the client.
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'An internal server error occurred in the proxy.';
    
    return NextResponse.json(
        { error: message }, 
        { status: status }
    );
  }
}
