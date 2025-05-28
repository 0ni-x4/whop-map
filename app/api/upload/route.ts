import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// OPTIMIZATION: Lightweight File polyfill
class FilePolyfill extends Blob {
  public name: string;
  public lastModified: number;
  public webkitRelativePath: string;

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options?.lastModified ?? Date.now();
    this.webkitRelativePath = '';
  }
}

if (typeof globalThis.File === 'undefined') {
  globalThis.File = FilePolyfill as any;
}

// OPTIMIZATION: Set function timeout to 30 seconds for Vercel
export const maxDuration = 30;

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // OPTIMIZATION: Quick auth check first
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = request.headers.get('x-user-id');
    const bizId = request.headers.get('x-biz-id');
    
    if (!userId || !bizId) {
      return NextResponse.json({ 
        error: "Missing userId or bizId in headers" 
      }, { status: 400 });
    }

    console.log(`🔄 Starting optimized upload for user ${userId}`);

    // OPTIMIZATION: Stream the file with size limit
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB max
    const file = await request.blob();
    
    if (file.size > MAX_SIZE) {
      console.warn(`⚠️ File too large: ${file.size} bytes (max: ${MAX_SIZE})`);
      return NextResponse.json({ 
        error: "File too large. Maximum size is 2MB." 
      }, { status: 413 });
    }

    console.log(`📁 Processing file: ${file.size} bytes`);

    // OPTIMIZATION: Create timeout for upload operation
    const UPLOAD_TIMEOUT = 20000; // 20 seconds for Whop upload
    
    const uploadPromise = whopApi
      .withUser(userId)
      .withCompany(bizId)
      .uploadAttachment({
        file: new File([file], `map-location-${Date.now()}.jpg`, {
          type: "image/jpeg",
        }),
        record: "forum_post",
      });

    // Race against timeout
    const response = await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT)
      )
    ]);

    const duration = Date.now() - startTime;
    console.log(`✅ Upload completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      attachmentId: response.directUploadId,
      url: response.attachment?.source?.url,
      duration: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Upload failed after ${duration}ms:`, error);
    
    // OPTIMIZATION: Return specific error messages for debugging
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Upload timeout. Please try again with a smaller image." },
          { status: 408 }
        );
      }
      if (error.message.includes('size')) {
        return NextResponse.json(
          { error: "File too large" },
          { status: 413 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
} 