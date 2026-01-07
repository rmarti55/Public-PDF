import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Fallback server-side upload for local development
// Limited to ~4.5MB on Vercel, but works without BLOB_READ_WRITE_TOKEN locally
export async function POST(request: NextRequest) {
  console.log("[/api/upload-server] Server upload fallback");
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("[/api/upload-server] File:", file.name, "Size:", file.size);

    // Upload to Vercel Blob (server-side)
    const blob = await put(file.name, file, {
      access: "public",
    });

    console.log("[/api/upload-server] Uploaded:", blob.url);

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[/api/upload-server] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
