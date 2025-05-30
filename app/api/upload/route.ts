import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { withAdvancedTimeout } from "@/lib/timeout-simulator";

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

async function postHandler(request: Request): Promise<NextResponse> {
  const startTime = Date.now();
  const userId = request.headers.get('x-user-id');
  const bizId = request.headers.get('x-biz-id');
  
  console.log(`🚀 === UPLOAD API START ===`);
  console.log(`👤 User: ${userId}, 🏢 Biz: ${bizId}`);

  if (!userId || !bizId) {
    const duration = Date.now() - startTime;
    console.error(`❌ Upload failed in ${duration}ms - Missing headers`);
    return NextResponse.json(
      { error: 'Missing user ID or business ID headers' },
      { status: 400 }
    );
  }

  try {
    // Step 1: Get file data
    const step1Start = Date.now();
    console.log(`📁 Step 1: Reading request body...`);
    
    const fileData = await request.arrayBuffer();
    const step1Duration = Date.now() - step1Start;
    console.log(`✅ Step 1 completed in ${step1Duration}ms - Size: ${fileData.byteLength} bytes`);

    // Step 2: Size validation
    const step2Start = Date.now();
    console.log(`🔍 Step 2: Validating file size...`);
    
    // OPTIMIZATION: Reject files larger than 2MB
    if (fileData.byteLength > 2 * 1024 * 1024) {
      const step2Duration = Date.now() - step2Start;
      const totalDuration = Date.now() - startTime;
      console.error(`❌ Step 2 failed in ${step2Duration}ms - File too large: ${fileData.byteLength} bytes`);
      console.error(`❌ Total duration: ${totalDuration}ms`);
      return NextResponse.json(
        { 
          error: 'File too large. Maximum size is 2MB.',
          size: fileData.byteLength,
          maxSize: 2 * 1024 * 1024
        },
        { status: 413 }
      );
    }
    
    const step2Duration = Date.now() - step2Start;
    console.log(`✅ Step 2 completed in ${step2Duration}ms - Size OK`);

    // Step 3: Create file for upload
    const step3Start = Date.now();
    console.log(`🔄 Step 3: Creating file for upload...`);
    
    const blob = new Blob([fileData], { type: 'image/jpeg' });
    const file = new File([blob], 'place-image.jpg', { type: 'image/jpeg' });
    
    const step3Duration = Date.now() - step3Start;
    console.log(`✅ Step 3 completed in ${step3Duration}ms - File created: ${file.name}`);

    // Step 4: Upload with timeout
    const step4Start = Date.now();
    console.log(`⬆️ Step 4: Uploading to Whop (timeout: 20s)...`);
    
    // OPTIMIZATION: Race against timeout
    const uploadPromise = whopApi
      .withUser(userId)
      .withCompany(bizId)
      .uploadAttachment({
        file: file,
        record: "forum_post",
      });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout')), 20000)
    );

    const result = await Promise.race([uploadPromise, timeoutPromise]);
    const step4Duration = Date.now() - step4Start;
    const totalDuration = Date.now() - startTime;

    if (result && typeof result === 'object' && 'directUploadId' in result && result.directUploadId) {
      console.log(`✅ Step 4 completed in ${step4Duration}ms - Upload successful!`);
      console.log(`🎯 === UPLOAD API COMPLETE ===`);
      console.log(`⏱️ TOTAL TIME: ${totalDuration}ms`);
      console.log(`📊 BREAKDOWN:`);
      console.log(`   - Step 1 (Read body): ${step1Duration}ms`);
      console.log(`   - Step 2 (Size check): ${step2Duration}ms`);
      console.log(`   - Step 3 (Create file): ${step3Duration}ms`);
      console.log(`   - Step 4 (Upload): ${step4Duration}ms`);
      console.log(`📎 DirectUploadId: ${result.directUploadId}`);
      
      return NextResponse.json({
        success: true,
        attachmentId: result.directUploadId,
        uploadTimeMs: totalDuration,
        breakdown: {
          readBody: step1Duration,
          sizeCheck: step2Duration,
          createFile: step3Duration,
          upload: step4Duration
        }
      });
    } else {
      console.error(`❌ Step 4 completed in ${step4Duration}ms - No directUploadId returned`);
      console.error(`❌ Total duration: ${totalDuration}ms`);
      console.error(`❌ Result:`, result);
      throw new Error('No directUploadId returned from upload');
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Upload failed after ${totalDuration}ms:`, error);

    if (error instanceof Error && error.message === 'Upload timeout') {
      return NextResponse.json(
        { 
          error: 'Upload timed out after 20 seconds',
          duration: totalDuration 
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration
      },
      { status: 500 }
    );
  }
}

// Wrap POST handler with Vercel timeout simulation
export const POST = withAdvancedTimeout(postHandler, {
  timeoutMs: 30000,     // 30 second Vercel limit
  warningMs: 25000,     // Warn at 25 seconds for uploads
  progressInterval: 3000 // Log progress every 3 seconds (more frequent for uploads)
}); 