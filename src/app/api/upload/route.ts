import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    console.log('[/api/upload] Handling upload request');
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // TODO: Add authentication check here
        // For now, allowing uploads (admin-only page)
        console.log('[/api/upload] Generating token for:', pathname);
        
        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Called by Vercel when upload completes
        // Note: This won't work on localhost, only on deployed Vercel
        console.log('[/api/upload] Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[/api/upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
