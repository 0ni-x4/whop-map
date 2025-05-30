import { whopApi } from "./whop-api";
import { PrismaClient } from "@prisma/client";
import { maybeSimulateSlow } from "./timeout-test";

const prisma = new PrismaClient();

export async function findOrCreateExperience(experienceId: string) {
  const whopExperience = await whopApi.getExperience({ experienceId });
  const experienceName = whopExperience.experience.name;
  const bizName = whopExperience.experience.company.title;
  const bizId = whopExperience.experience.company.id;

  let experience = await prisma.experience.findUnique({
    where: { id: experienceId },
    include: { places: true },
  });
  if (!experience) {
    experience = await prisma.experience.create({
      data: {
        id: experienceId,
        title: experienceName,
        bizName,
        bizId,
        webhookUrl: "",
      },
      include: { places: true },
    });
    sendWhopWebhook({
      content: "Someone installed the map places app in their whop!",
    });
  } else {
    experience = await prisma.experience.update({
      where: { id: experienceId },
      data: { title: experienceName, bizName, bizId },
      include: { places: true },
    });
  }
  return experience;
}

export async function createPlace({
  experienceId,
  name,
  description,
  latitude,
  longitude,
  address,
  category,
}: {
  experienceId: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: string;
}) {
  return await prisma.place.create({
    data: {
      experienceId,
      name,
      description,
      latitude,
      longitude,
      address,
      category,
    },
  });
}

export async function getPlaces(experienceId: string) {
  return await prisma.place.findMany({
    where: { experienceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deletePlace(placeId: string) {
  return await prisma.place.delete({
    where: { id: placeId },
  });
}

export async function updatePlace({
  placeId,
  name,
  description,
  latitude,
  longitude,
  address,
  category,
}: {
  placeId: string;
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  category?: string;
}) {
  return await prisma.place.update({
    where: { id: placeId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(address !== undefined && { address }),
      ...(category !== undefined && { category }),
    },
  });
}

export async function sendWhopWebhook({
  content,
  experienceId = "exp_QccW4l1rRJok5d",
}: {
  content: string;
  experienceId?: string;
}) {
  const payload = {
    content, // For simple display if the webhook supports it (Discord-style)
  };

  const experience = await prisma.experience.findUnique({
    where: {
      id: experienceId,
    },
  });

  const webhookUrl =
    experience?.webhookUrl || process.env.DEFAULT_WEBHOOK_URL || "";

  // Skip webhook if no URL is configured
  if (!webhookUrl || webhookUrl.trim() === "") {
    console.log("No webhook URL configured, skipping webhook");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `Webhook to Whop failed with status ${
          response.status
        }: ${responseBody}. Payload: ${JSON.stringify(payload)}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error sending Whop webhook: ${errorMessage}. Payload: ${JSON.stringify(
        payload
      )}`
    );
  }
}

/**
 * OPTIMIZED: Gets a smaller, faster-loading Mapbox Static image
 */
export async function getMapboxStaticImage(lat: number, lng: number, name: string): Promise<string | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn("No Mapbox token configured");
    return null;
  }

  try {
    // OPTIMIZATION: Smaller image size (300x200 instead of 600x400@2x)
    // OPTIMIZATION: Single resolution (no @2x) for faster download
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `pin-s-marker+dc2626(${lng},${lat})/` + // Red pin marker
      `${lng},${lat},12,0/` + // OPTIMIZATION: Lower zoom (12 instead of 14)
      `300x200?` + // OPTIMIZATION: Smaller size for faster loading
      `access_token=${mapboxToken}`;

    return staticImageUrl;
  } catch (error) {
    console.error("Error generating Mapbox Static image URL:", error);
    return null;
  }
}

/**
 * OPTIMIZED: Faster image upload with aggressive timeout controls for Vercel
 */
export async function uploadImageToWhop(imageUrl: string, userId: string, bizId: string): Promise<string | null> {
  const startTime = Date.now();
  console.log(`⬆️ === IMAGE UPLOAD START ===`);
  console.log(`🔗 Image URL: ${imageUrl.substring(0, 80)}...`);
  
  try {
    // OPTIMIZATION: Much more aggressive timeout limits for Vercel
    const FETCH_TIMEOUT = 5000; // 5 seconds for image fetch (was 10s)
    const UPLOAD_TIMEOUT = 8000; // 8 seconds for upload (was 15s)
    
    console.log(`⚙️ Timeouts: Fetch=${FETCH_TIMEOUT}ms, Upload=${UPLOAD_TIMEOUT}ms`);
    
    // Step A: Fetch image from Mapbox
    const fetchStart = Date.now();
    console.log(`📥 Step A: Fetching image from Mapbox...`);
    
    // OPTIMIZATION: Fetch with very aggressive timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    const imageResponse = await maybeSimulateSlow(
      () => fetch(imageUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WhopApp/1.0)',
        }
      }),
      8000, // 8 second delay in simulation mode
      "Mapbox image fetch"
    );

    clearTimeout(timeoutId);
    const fetchDuration = Date.now() - fetchStart;

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    console.log(`✅ Step A completed in ${fetchDuration}ms - Status: ${imageResponse.status}`);

    // Step B: Convert to blob
    const blobStart = Date.now();
    console.log(`🔄 Step B: Converting response to blob...`);
    
    const imageBlob = await imageResponse.blob();
    const blobDuration = Date.now() - blobStart;
    
    console.log(`✅ Step B completed in ${blobDuration}ms - Size: ${imageBlob.size} bytes`);
    
    // Step C: Size check
    const sizeCheckStart = Date.now();
    console.log(`🔍 Step C: Checking file size...`);
    
    // OPTIMIZATION: Skip upload if image is too large (>300KB for faster processing)
    if (imageBlob.size > 300000) {
      const sizeCheckDuration = Date.now() - sizeCheckStart;
      console.warn(`⚠️ Step C completed in ${sizeCheckDuration}ms - Image too large (${imageBlob.size} bytes), skipping upload`);
      return null;
    }
    
    const sizeCheckDuration = Date.now() - sizeCheckStart;
    console.log(`✅ Step C completed in ${sizeCheckDuration}ms - Size OK (${imageBlob.size} bytes)`);
    
    // Step D: Upload to Whop
    const uploadStart = Date.now();
    console.log(`🚀 Step D: Uploading to Whop via API route...`);
    
    // OPTIMIZATION: Upload with aggressive timeout control
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const uploadController = new AbortController();
    const uploadTimeoutId = setTimeout(() => uploadController.abort(), UPLOAD_TIMEOUT);
    
    const uploadResponse = await Promise.race([
      fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: imageBlob,
        headers: {
          'Content-Type': 'image/jpeg',
          'x-user-id': userId,
          'x-biz-id': bizId,
        },
        signal: uploadController.signal,
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT)
      )
    ]);

    clearTimeout(uploadTimeoutId);
    const uploadDuration = Date.now() - uploadStart;

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload API failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log(`✅ Step D completed in ${uploadDuration}ms - Upload response: ${uploadResponse.status}`);

    // Step E: Parse response
    const parseStart = Date.now();
    console.log(`📋 Step E: Parsing upload response...`);
    
    const uploadResult = await uploadResponse.json();
    const parseDuration = Date.now() - parseStart;
    const totalDuration = Date.now() - startTime;

    if (uploadResult.success && uploadResult.attachmentId) {
      console.log(`✅ Step E completed in ${parseDuration}ms - Success!`);
      console.log(`🎯 === IMAGE UPLOAD COMPLETE ===`);
      console.log(`⏱️ TOTAL TIME: ${totalDuration}ms`);
      console.log(`📊 BREAKDOWN:`);
      console.log(`   - Step A (Fetch): ${fetchDuration}ms`);
      console.log(`   - Step B (Blob): ${blobDuration}ms`);
      console.log(`   - Step C (Size check): ${sizeCheckDuration}ms`);
      console.log(`   - Step D (Upload): ${uploadDuration}ms`);
      console.log(`   - Step E (Parse): ${parseDuration}ms`);
      console.log(`📎 Attachment ID: ${uploadResult.attachmentId}`);
      return uploadResult.attachmentId;
    } else {
      console.error(`❌ Step E completed in ${parseDuration}ms - Upload result missing attachmentId:`, uploadResult);
      return null;
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Image upload failed after ${totalDuration}ms:`, error);
    
    // OPTIMIZATION: Log specific error types for debugging
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error("⚠️ Image upload aborted due to timeout");
      } else if (error.message.includes('fetch')) {
        console.error("⚠️ Network error during image fetch");
      } else if (error.message.includes('timeout')) {
        console.error("⚠️ Timeout during image processing");
      }
    }
    
    return null;
  }
}

/**
 * OPTIMIZED: Creates forum post with optional async image upload
 */
export async function createPlaceAnnouncementPost({
  place,
  experienceId,
  userId,
  bizId,
  skipImageUpload = false, // OPTIMIZATION: Allow skipping slow image upload
}: {
  place: {
    id: string;
    name: string;
    address?: string | null;
    description?: string | null;
    latitude: number;
    longitude: number;
    category?: string | null;
  };
  experienceId: string;
  userId: string;
  bizId: string;
  skipImageUpload?: boolean;
}) {
  const totalStartTime = Date.now();
  console.log(`🚀 === FORUM POST CREATION START for "${place.name}" ===`);
  
  try {
    // Step 1: Get experience details
    const step1Start = Date.now();
    console.log(`📋 Step 1: Getting experience details...`);
    
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      console.error("❌ Experience not found for URL generation");
      return;
    }
    
    const step1Duration = Date.now() - step1Start;
    console.log(`✅ Step 1 completed in ${step1Duration}ms - Experience: ${experience.title}`);

    // Step 2: Generate URL
    const step2Start = Date.now();
    console.log(`🔗 Step 2: Generating map URL...`);
    
    // Helper function to make strings URL-friendly
    const urlFriendly = (str: string) => 
      str.toLowerCase()
         .replace(/\s+/g, '-')
         .replace(/[^a-z0-9-]/g, '')
         .replace(/-+/g, '-')
         .replace(/^-|-$/g, '');

    // Create Whop public URL format
    const bizNameUrl = urlFriendly(experience.bizName);
    const experienceTitleUrl = urlFriendly(experience.title);
    const expIdWithoutPrefix = experienceId.slice(4);
    const mapUrl = `https://whop.com/${bizNameUrl}/${experienceTitleUrl}-${expIdWithoutPrefix}/app`;
    
    const step2Duration = Date.now() - step2Start;
    console.log(`✅ Step 2 completed in ${step2Duration}ms - URL: ${mapUrl}`);

    // Step 3: Image handling
    let attachmentId: string | null = null;
    let staticImageUrl: string | null = null;
    let imageStepDuration = 0;

    if (!skipImageUpload) {
      const imageStartTime = Date.now();
      console.log(`📸 Step 3: Starting image process...`);
      
      // Sub-step 3a: Generate Mapbox URL
      const mapboxUrlStart = Date.now();
      console.log(`🗺️ Step 3a: Generating Mapbox Static image URL...`);
      
      staticImageUrl = await getMapboxStaticImage(
        place.latitude,
        place.longitude,
        place.name
      );
      
      const mapboxUrlDuration = Date.now() - mapboxUrlStart;
      console.log(`✅ Step 3a completed in ${mapboxUrlDuration}ms - ${staticImageUrl ? 'URL generated' : 'Failed to generate URL'}`);

      // Sub-step 3b: Upload image
      if (staticImageUrl) {
        const uploadStart = Date.now();
        console.log(`⬆️ Step 3b: Starting image upload with 15s timeout...`);
        
        try {
          // OPTIMIZATION: Race against aggressive timeout for entire image upload process
          attachmentId = await Promise.race([
            uploadImageToWhop(staticImageUrl, userId, bizId),
            new Promise<string | null>((_, reject) => 
              setTimeout(() => reject(new Error('Total image process timeout')), 15000) // 15 seconds max (was 25s)
            )
          ]);
          
          const uploadDuration = Date.now() - uploadStart;
          
          if (attachmentId) {
            console.log(`✅ Step 3b completed in ${uploadDuration}ms - Upload successful: ${attachmentId}`);
          } else {
            console.log(`⚠️ Step 3b completed in ${uploadDuration}ms - Upload failed (no attachment ID returned)`);
          }
        } catch (timeoutError) {
          const uploadDuration = Date.now() - uploadStart;
          console.log(`⚠️ Step 3b timed out after ${uploadDuration}ms - Proceeding without image attachment`);
          attachmentId = null;
        }
      }
      
      imageStepDuration = Date.now() - imageStartTime;
      console.log(`📸 Step 3 total duration: ${imageStepDuration}ms - ${attachmentId ? 'With attachment' : 'No attachment'}`);
    } else {
      console.log(`⏭️ Step 3: Skipped image upload (skipImageUpload=true)`);
    }

    // Step 4: Create forum content
    const step4Start = Date.now();
    console.log(`📝 Step 4: Creating forum post content...`);
    
    const addressText = place.address 
      ? `Address: ${place.address}`
      : `Coordinates: ${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;

    const categoryText = place.category ? `Category: ${place.category}` : null;
    const descriptionText = place.description ? `Description: ${place.description}` : null;
    const mapUrlText = `🔗 View on Map: ${mapUrl}`;

    // Create content based on what we have
    let postContent = `A new place has been added to the map! 🗺️
${addressText}
${categoryText || ''}
${descriptionText || ''}

${mapUrlText}`;

    // Add image info based on what we achieved
    if (attachmentId) {
      postContent += '\n📸 See the map location in the image attached below!';
    } else if (staticImageUrl && !skipImageUpload) {
      postContent += `\n📸 **Location Preview**: ${staticImageUrl}`;
    }
    
    const step4Duration = Date.now() - step4Start;
    console.log(`✅ Step 4 completed in ${step4Duration}ms - Content prepared (${postContent.length} chars)`);

    // Step 5: Create/find forum
    const step5Start = Date.now();
    console.log(`🏛️ Step 5: Creating/finding Places Forum...`);
    
    let forumId: string | null = null;
    try {
      const forumResult = await whopApi
        .withCompany(bizId)
        .findOrCreateForum({
          input: {
            experienceId: experienceId,
            name: "Places Forum",
            whoCanPost: "everyone",
          },
        });
      
      forumId = forumResult.createForum?.id || experienceId;
      const step5Duration = Date.now() - step5Start;
      console.log(`✅ Step 5 completed in ${step5Duration}ms - Forum ready: ${forumId}`);
    } catch (error: any) {
      const step5Duration = Date.now() - step5Start;
      console.log(`⚠️ Step 5 completed in ${step5Duration}ms - Using experienceId as forumId fallback`);
      forumId = experienceId;
    }

    if (!forumId) {
      console.error("❌ Could not create or find forum - aborting");
      return;
    }

    // Step 6: Prepare forum post
    const step6Start = Date.now();
    console.log(`🛠️ Step 6: Preparing forum post input...`);
    
    const forumPostInput: any = {
      forumExperienceId: forumId,
      title: `📍 New Place Added: ${place.name}`,
      content: postContent,
      isMention: true,
    };

    // OPTIMIZATION: Only add attachment if we successfully uploaded
    if (attachmentId) {
      forumPostInput.attachments = [
        {
          directUploadId: attachmentId,
        },
      ];
      console.log(`📎 Including image attachment: ${attachmentId}`);
    }
    
    const step6Duration = Date.now() - step6Start;
    console.log(`✅ Step 6 completed in ${step6Duration}ms - Post input prepared`);

    // Step 7: Create forum post
    const step7Start = Date.now();
    console.log(`📤 Step 7: Creating forum post...`);
    
    const postResult = await whopApi
      .withCompany(bizId)
      .createForumPost({
        input: forumPostInput,
      });

    const step7Duration = Date.now() - step7Start;
    const totalDuration = Date.now() - totalStartTime;

    if (postResult.createForumPost) {
      console.log(`✅ Step 7 completed in ${step7Duration}ms - Forum post created!`);
      console.log(`📝 Post ID: ${postResult.createForumPost.id}`);
      
      if (attachmentId) {
        console.log(`📸 With image attachment: ${attachmentId}`);
      } else if (staticImageUrl) {
        console.log(`📸 With image URL in content: ${staticImageUrl}`);
      } else {
        console.log(`📝 Text-only post (no image)`);
      }
      
      console.log(`🎯 === FORUM POST CREATION COMPLETE ===`);
      console.log(`⏱️ TOTAL TIME: ${totalDuration}ms`);
      console.log(`📊 BREAKDOWN:`);
      console.log(`   - Step 1 (Experience): ${step1Duration}ms`);
      console.log(`   - Step 2 (URL): ${step2Duration}ms`);
      console.log(`   - Step 3 (Image): ${imageStepDuration}ms`);
      console.log(`   - Step 4 (Content): ${step4Duration}ms`);
      console.log(`   - Step 5 (Forum): ${Date.now() - step5Start}ms`);
      console.log(`   - Step 6 (Prepare): ${step6Duration}ms`);
      console.log(`   - Step 7 (Post): ${step7Duration}ms`);
    } else {
      console.error(`❌ Step 7 failed in ${step7Duration}ms - No forum post created`);
    }

  } catch (error) {
    const totalDuration = Date.now() - totalStartTime;
    console.error(`❌ Forum post creation failed after ${totalDuration}ms:`, error);
    
    // OPTIMIZATION: Always provide fallback notification
    console.log(`=== FALLBACK: New Place Added ===`);
    console.log(`📍 ${place.name}`);
    if (place.address) console.log(`📍 ${place.address}`);
    if (place.description) console.log(`📝 ${place.description}`);
    
    // Send basic webhook notification
    if (process.env.DEFAULT_WEBHOOK_URL) {
      try {
        await fetch(process.env.DEFAULT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📍 New place added: **${place.name}**${place.address ? `\n📍 ${place.address}` : ''}`
          })
        });
        console.log(`✅ Fallback webhook sent`);
      } catch (webhookError) {
        console.error("Fallback webhook failed:", webhookError);
      }
    }
  }
}
