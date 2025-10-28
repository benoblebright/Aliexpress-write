import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    const response = await fetch('https://alihelper-imageurl-53912196882.asia-northeast3.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External API error: ${response.status}`, errorText);
      return NextResponse.json({ error: `Failed to fetch image URL. Status: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy API error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
