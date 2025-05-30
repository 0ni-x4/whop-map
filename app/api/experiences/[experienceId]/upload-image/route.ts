import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";

// OPTIMIZATION: Lightweight File polyfill for server environment
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

export const maxDuration = 30;

/**
 * CLIENT-SIDE IMAGE UPLOAD API
 * This receives the image blob from the client and uploads it to Whop
 * Much faster than server-side fetch + upload
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Extract experience ID from URL
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/upload-image/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    console.log(`🖥️ === CLIENT IMAGE UPLOAD API START ===`);
    console.log(`📍 Experience: ${experienceId}`);

    // Verify user authentication
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this experience
    const hasAccess = await whopApi.checkIfUserHasAccessToExperience({
      userId: userToken.userId,
      experienceId,
    });

    if (!hasAccess.hasAccessToExperience.hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized, no access" },
        { status: 401 }
      );
    }

    if (hasAccess.hasAccessToExperience.accessLevel !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized, admin access required" },
        { status: 401 }
      );
    }

    // Get experience data for bizId
    const experienceData = await whopApi.getExperience({ experienceId });
    const bizId = experienceData.experience.company.id;

    console.log(`👤 User: ${userToken.userId}, 🏢 Biz: ${bizId}`);

    // Step 1: Get the image blob from request body
    const step1Start = Date.now();
    console.log(`📁 Step 1: Reading image blob from client...`);
    
    const imageData = await request.arrayBuffer();
    const step1Duration = Date.now() - step1Start;
    console.log(`✅ Step 1 completed in ${step1Duration}ms - Size: ${imageData.byteLength} bytes`);

    // Step 2: Size validation
    const step2Start = Date.now();
    console.log(`🔍 Step 2: Validating file size...`);
    
    if (imageData.byteLength > 2 * 1024 * 1024) {
      const step2Duration = Date.now() - step2Start;
      console.error(`❌ Step 2 failed in ${step2Duration}ms - File too large`);
      return NextResponse.json(
        { 
          error: 'File too large. Maximum size is 2MB.',
          size: imageData.byteLength,
          maxSize: 2 * 1024 * 1024
        },
        { status: 413 }
      );
    }
    
    const step2Duration = Date.now() - step2Start;
    console.log(`✅ Step 2 completed in ${step2Duration}ms - Size OK`);

    // Step 3: Create file for Whop upload
    const step3Start = Date.now();
    console.log(`🔄 Step 3: Creating file for Whop upload...`);
    
    const blob = new Blob([imageData], { type: 'image/jpeg' });
    const file = new File([blob], 'place-image.jpg', { type: 'image/jpeg' });
    
    const step3Duration = Date.now() - step3Start;
    console.log(`✅ Step 3 completed in ${step3Duration}ms - File created`);

    // Step 4: Upload directly to Whop
    const step4Start = Date.now();
    console.log(`⬆️ Step 4: Uploading to Whop...`);
    
    const result = await whopApi
      .withUser(userToken.userId)
      .withCompany(bizId)
      .uploadAttachment({
        file: file,
        record: "forum_post",
      });

    const step4Duration = Date.now() - step4Start;
    const totalDuration = Date.now() - startTime;

    if (result && typeof result === 'object' && 'directUploadId' in result && result.directUploadId) {
      console.log(`✅ Step 4 completed in ${step4Duration}ms - Upload successful!`);
      console.log(`🎯 === CLIENT IMAGE UPLOAD COMPLETE ===`);
      console.log(`⏱️ TOTAL TIME: ${totalDuration}ms`);
      console.log(`📊 BREAKDOWN:`);
      console.log(`   - Step 1 (Read blob): ${step1Duration}ms`);
      console.log(`   - Step 2 (Size check): ${step2Duration}ms`);
      console.log(`   - Step 3 (Create file): ${step3Duration}ms`);
      console.log(`   - Step 4 (Upload): ${step4Duration}ms`);
      console.log(`📎 DirectUploadId: ${result.directUploadId}`);
      
      return NextResponse.json({
        success: true,
        attachmentId: result.directUploadId,
        uploadTimeMs: totalDuration,
        breakdown: {
          readBlob: step1Duration,
          sizeCheck: step2Duration,
          createFile: step3Duration,
          upload: step4Duration
        }
      });
    } else {
      console.error(`❌ Step 4 completed in ${step4Duration}ms - No directUploadId returned`);
      console.error(`❌ Result:`, result);
      throw new Error('No directUploadId returned from upload');
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Client image upload failed after ${totalDuration}ms:`, error);

    return NextResponse.json(
      { 
        error: 'Image upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: totalDuration
      },
      { status: 500 }
    );
  }
} 