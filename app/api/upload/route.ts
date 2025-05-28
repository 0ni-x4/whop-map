import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// File polyfill for Node.js environments
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

// Make File available in Node.js environment
if (typeof globalThis.File === 'undefined') {
  globalThis.File = FilePolyfill as any;
}

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get userId and bizId from headers
    const userId = request.headers.get('x-user-id');
    const bizId = request.headers.get('x-biz-id');
    
    if (!userId || !bizId) {
      return NextResponse.json({ 
        error: "Missing userId or bizId in headers" 
      }, { status: 400 });
    }

    // Get the file from the request
    const file = await request.blob();
    
    // Upload to Whop with user context
    const response = await whopApi
      .withUser(userId)
      .withCompany(bizId)
      .uploadAttachment({
        file: new File([file], `map-location-${Date.now()}.jpg`, {
          type: "image/jpeg",
        }),
        record: "forum_post", // This specifies it's for forum post attachment
      });

    // The response includes the directUploadId and URL
    return NextResponse.json({
      success: true,
      attachmentId: response.directUploadId,
      url: response.attachment?.source?.url
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 