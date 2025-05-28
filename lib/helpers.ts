import { whopApi } from "./whop-api";
import { PrismaClient } from "@prisma/client";

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
 * OPTIMIZED: Faster image upload with timeout controls and compression
 */
export async function uploadImageToWhop(imageUrl: string, userId: string, bizId: string): Promise<string | null> {
  try {
    // OPTIMIZATION: Set strict timeout limits
    const FETCH_TIMEOUT = 10000; // 10 seconds for image fetch
    const UPLOAD_TIMEOUT = 15000; // 15 seconds for upload
    
    console.log(`🔄 Fetching optimized image from: ${imageUrl}`);
    
    // OPTIMIZATION: Fetch with timeout control
    const imageResponse = await Promise.race([
      fetch(imageUrl),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Image fetch timeout')), FETCH_TIMEOUT)
      )
    ]);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log(`📁 Image fetched: ${imageBlob.size} bytes (optimized size)`);
    
    // OPTIMIZATION: Skip upload if image is too large (>500KB)
    if (imageBlob.size > 500000) {
      console.warn(`⚠️ Image too large (${imageBlob.size} bytes), skipping upload`);
      return null;
    }
    
    console.log(`🔄 Uploading to Whop via API route...`);
    
    // OPTIMIZATION: Upload with timeout control
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const uploadResponse = await Promise.race([
      fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: imageBlob,
        headers: {
          'Content-Type': 'image/jpeg',
          'x-user-id': userId,
          'x-biz-id': bizId,
        },
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), UPLOAD_TIMEOUT)
      )
    ]);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload API failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    if (uploadResult.success && uploadResult.attachmentId) {
      console.log(`✅ Image uploaded successfully! DirectUploadId: ${uploadResult.attachmentId}`);
      return uploadResult.attachmentId;
    } else {
      console.error("Upload result missing attachmentId:", uploadResult);
      return null;
    }
  } catch (error) {
    console.error("Error uploading image to Whop:", error);
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
  try {
    // Get experience details for URL generation
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      console.error("Experience not found for URL generation");
      return;
    }

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

    // OPTIMIZATION: Handle image upload strategy
    let attachmentId: string | null = null;
    let staticImageUrl: string | null = null;

    if (!skipImageUpload) {
      // Get optimized Mapbox Static image URL
      staticImageUrl = await getMapboxStaticImage(
        place.latitude,
        place.longitude,
        place.name
      );

      // OPTIMIZATION: Try fast image upload with timeout
      if (staticImageUrl) {
        console.log(`🔄 Attempting fast image upload for place: ${place.name}`);
        
        try {
          // OPTIMIZATION: Race against timeout for entire image upload process
          attachmentId = await Promise.race([
            uploadImageToWhop(staticImageUrl, userId, bizId),
            new Promise<string | null>((_, reject) => 
              setTimeout(() => reject(new Error('Total image process timeout')), 25000) // 25 seconds max
            )
          ]);
          
          if (attachmentId) {
            console.log(`✅ Fast image upload successful: ${attachmentId}`);
          }
        } catch (timeoutError) {
          console.log(`⚠️ Image upload timeout, proceeding without attachment`);
          attachmentId = null;
        }
      }
    }

    // OPTIMIZATION: Always create forum post, even if image upload fails
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

    // OPTIMIZATION: Create forum first (fast operation)
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
      console.log(`✅ Forum ready: ${forumId}`);
    } catch (error: any) {
      console.log("Using experienceId as forumId fallback");
      forumId = experienceId;
    }

    if (!forumId) {
      console.error("Could not create or find forum");
      return;
    }

    // Prepare forum post input
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
      console.log(`✅ Including image attachment: ${attachmentId}`);
    }

    // Create the forum post
    const postResult = await whopApi
      .withCompany(bizId)
      .createForumPost({
        input: forumPostInput,
      });

    if (postResult.createForumPost) {
      console.log(`✅ Forum post created for place: ${place.name}`);
      console.log(`📝 Post ID: ${postResult.createForumPost.id}`);
      
      if (attachmentId) {
        console.log(`📸 With image attachment: ${attachmentId}`);
      } else if (staticImageUrl) {
        console.log(`📸 With image URL in content: ${staticImageUrl}`);
      } else {
        console.log(`📝 Text-only post (no image)`);
      }
    }

  } catch (error) {
    console.error("Error creating place announcement post:", error);
    
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