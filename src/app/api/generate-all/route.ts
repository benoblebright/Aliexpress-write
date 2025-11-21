
import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

export const maxDuration = 300; // 5분 타임아웃

const CLOUD_RUN_URL = 'https://alihelper-allimage-53912196882.asia-northeast3.run.app';

interface BackendDetail {
    sale_volume: number | string | null;
    product_title: string | null;
    source: string;
    product_main_image_url: string | null;
    target_sale_price: number | string | null;
    // The backend might also return korean_summary and other fields.
    korean_summary?: string; 
    korean_local_count?: number;
    total_num?: number;
}

interface BackendResponse {
    product_urls: string[];
    final_urls: string[];
    details: BackendDetail[];
}

interface FrontendInfo {
    original_url: string;
    final_url: string;
    product_title: string | null;
    product_main_image_url: string | null;
    sale_volume: string | number | null;
    korean_summary?: string;
    korean_local_count?: number;
    total_num?: number;
}


export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
    const { target_urls, aff_short_key } = requestBody;

    if (!Array.isArray(target_urls) || target_urls.length === 0) {
      return NextResponse.json({ error: 'target_urls is required and must be an array' }, { status: 400 });
    }
    if (!Array.isArray(aff_short_key) || aff_short_key.length === 0) {
      return NextResponse.json({ error: 'aff_short_key is required and must be an array' }, { status: 400 });
    }
     if (target_urls.length !== aff_short_key.length) {
      return NextResponse.json({ error: 'target_urls and aff_short_key must have the same length' }, { status: 400 });
    }


    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(CLOUD_RUN_URL);

    const response = await client.request({
      url: CLOUD_RUN_URL,
      method: 'POST',
      data: { target_urls, aff_short_key },
    });

    const responseData = response.data as BackendResponse;
    
    // --- Data Restructuring Logic ---
    if (responseData && Array.isArray(responseData.product_urls) && Array.isArray(responseData.final_urls) && Array.isArray(responseData.details)) {
        
        if (responseData.product_urls.length !== responseData.details.length || responseData.product_urls.length !== responseData.final_urls.length) {
             const errorMessage = `[PROXY-ALL] Error: Mismatched array lengths in backend response.`;
             console.error(errorMessage, "Response Data:", JSON.stringify(responseData, null, 2));
             return NextResponse.json({ error: 'Mismatched data arrays from the main Cloud Run service' }, { status: 500 });
        }

        const combinedInfos: FrontendInfo[] = responseData.product_urls.map((originalUrl, index) => {
            const detail = responseData.details[index];
            const finalUrl = responseData.final_urls[index];
            return {
                original_url: originalUrl,
                final_url: finalUrl,
                product_title: detail.product_title,
                product_main_image_url: detail.product_main_image_url,
                sale_volume: detail.sale_volume,
                // Add other fields from detail if they exist
                korean_summary: (detail as any).korean_summary,
                korean_local_count: (detail as any).korean_local_count,
                total_num: (detail as any).total_num,
            };
        });

        // The original request order is maintained by the mapping above.
        // We now have an array of objects that the frontend expects.
        return NextResponse.json({ allInfos: combinedInfos });

    } else {
       const errorMessage = `[PROXY-ALL] Error: Invalid response structure. Expected 'product_urls', 'final_urls', and 'details' arrays.`;
       console.error(errorMessage, "Response Data:", JSON.stringify(responseData, null, 2));
      return NextResponse.json({ error: 'Invalid response structure from the main Cloud Run service', details: responseData }, { status: 500 });
    }

  } catch (error: any) {
    const errorMessage = `[PROXY-ALL] An unexpected error occurred.`;
    console.error(errorMessage, "Request Body:", JSON.stringify(requestBody, null, 2));
    console.error('[PROXY-ALL] Error Message:', error.message);
    if (error.response) {
      console.error(`[PROXY-ALL] Upstream error response status:`, error.response.status);
      console.error(`[PROXY-ALL] Upstream error response data:`, JSON.stringify(error.response.data, null, 2));
       return NextResponse.json({ error: 'Upstream service failed', details: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred in the proxy.', details: { message: error.message } },
      { status: 500 }
    );
  }
}
