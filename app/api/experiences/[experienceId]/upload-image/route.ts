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
  
  console.log(`🖥️ === CLIENT IMAGE UPLOAD API START ===`);
  console.log(`🔗 Request URL: ${request.url}`);
  console.log(`📊 Request headers:`, Object.fromEntries(request.headers.entries()));
  
  try {
    // Extract experience ID from URL
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/upload-image/);
    const experienceId = match ? match[1] : null;

    console.log(`🔍 URL pathname: ${url.pathname}`);
    console.log(`🔍 Regex match result:`, match);
    console.log(`📍 Extracted experience ID: ${experienceId}`);

    if (!experienceId) {
      console.error(`❌ Missing experienceId - URL: ${request.url}`);
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    console.log(`📍 Experience: ${experienceId}`);

    // Verify user authentication
    const headersList = await headers();
    console.log(`🔐 Verifying user token...`);
    const userToken = await verifyUserToken(headersList);
    
    if (!userToken) {
      console.error(`❌ No user token found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${userToken.userId}`);

    // Check if user has access to this experience
    console.log(`🔍 Checking user access to experience...`);
    const hasAccess = await whopApi.checkIfUserHasAccessToExperience({
      userId: userToken.userId,
      experienceId,
    });

    console.log(`📊 Access check result:`, hasAccess.hasAccessToExperience);

    if (!hasAccess.hasAccessToExperience.hasAccess) {
      console.error(`❌ User has no access to experience`);
      return NextResponse.json(
        { error: "Unauthorized, no access" },
        { status: 401 }
      );
    }

    if (hasAccess.hasAccessToExperience.accessLevel !== "admin") {
      console.error(`❌ User is not admin: ${hasAccess.hasAccessToExperience.accessLevel}`);
      return NextResponse.json(
        { error: "Unauthorized, admin access required" },
        { status: 401 }
      );
    }

    console.log(`✅ User has admin access`);

    // Get experience data for bizId
    console.log(`🔍 Getting experience data for bizId...`);
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
      console.error(`❌ Step 2 failed in ${step2Duration}ms - File too large: ${imageData.byteLength} bytes`);
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
    console.log(`✅ Step 3 completed in ${step3Duration}ms - File created: ${file.name}, size: ${file.size}`);

    // Step 4: Upload directly to Whop
    const step4Start = Date.now();
    console.log(`⬆️ Step 4: Uploading to Whop via SDK...`);
    
    const result = await whopApi
      .withUser(userToken.userId)
      .withCompany(bizId)
      .uploadAttachment({
        file: file,
        record: "forum_post",
      });

    const step4Duration = Date.now() - step4Start;
    const totalDuration = Date.now() - startTime;

    console.log(`📄 Whop SDK result:`, result);
    console.log(`📊 Result type: ${typeof result}, Is object: ${typeof result === 'object'}`);

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
      console.error(`❌ Has directUploadId: ${'directUploadId' in (result || {})}`);
      throw new Error('No directUploadId returned from upload');
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Client image upload failed after ${totalDuration}ms:`, error);
    console.error(`❌ Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`❌ Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

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