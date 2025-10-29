import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const CLOUD_RUN_URL = 'https://alihelper-imageurl-53912196882.asia-northeast3.run.app';

export async function POST(request: Request) {
  try {
    const { target_url } = await request.json();

    if (!target_url) {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    // GoogleAuth 인스턴스를 생성합니다.
    const auth = new GoogleAuth();
    
    // Cloud Run 서비스 URL을 타겟으로 하는 인증 클라이언트를 가져옵니다.
    // 이 클라이언트는 자동으로 ID 토큰을 관리하고 요청에 포함시킵니다.
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    // 인증 클라이언트를 사용하여 POST 요청을 보냅니다.
    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: { target_url },
    });

    if (response.status !== 200) {
        console.error(`External API error: ${response.status}`, response.data);
        return NextResponse.json({ error: `Failed to fetch image URL. Status: ${response.status}.`, details: response.data }, { status: response.status });
    }

    // Cloud Run 서비스에서 받은 데이터를 그대로 클라이언트에 전달합니다.
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Proxy API error:', error.message, error.stack);
    return NextResponse.json({ error: 'An internal server error occurred.', details: error.message }, { status: 500 });
  }
}
