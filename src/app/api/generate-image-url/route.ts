import { NextResponse } from 'next/server';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }
    
    // NOTE: This is a direct, unauthenticated request. If the target Cloud Run
    // service requires authentication, this call will fail. This proxy is
    // here to solve CORS issues, not authentication.
    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_url }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error from external service: ${response.status}`, errorBody);
        return NextResponse.json({ error: `External service failed: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Proxy API error:', error);
    return NextResponse.json(
        { error: 'An internal server error occurred in the proxy.' }, 
        { status: 500 }
    );
  }
}
