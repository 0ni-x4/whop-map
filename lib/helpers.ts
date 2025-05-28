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
 * Gets a Mapbox Static image for a given location
 */
export async function getMapboxStaticImage(lat: number, lng: number, name: string): Promise<string | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn("No Mapbox token configured");
    return null;
  }

  try {
    // Create a Mapbox Static API URL with a pin marker
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `pin-s-marker+dc2626(${lng},${lat})/` + // Red pin marker
      `${lng},${lat},14,0/` + // Center, zoom, bearing
      `600x400@2x?` + // Size and retina
      `access_token=${mapboxToken}`;

    return staticImageUrl;
  } catch (error) {
    console.error("Error generating Mapbox Static image URL:", error);
    return null;
  }
}

/**
 * Uploads an image from a URL to Whop's media service using our API route
 * This works in Node.js server environments and returns a directUploadId for forum attachments
 */
export async function uploadImageToWhop(imageUrl: string, userId: string, bizId: string): Promise<string | null> {
  try {
    // First, fetch the image from the URL
    console.log(`🔄 Fetching image from: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log(`📁 Image fetched: ${imageBlob.size} bytes`);
    
    console.log(`🔄 Uploading to Whop via API route...`);
    
    // Upload using our API route with absolute URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': 'image/jpeg',
        'x-user-id': userId,
        'x-biz-id': bizId,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload API failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    if (uploadResult.success && uploadResult.attachmentId) {
      console.log(`✅ Image uploaded successfully! DirectUploadId: ${uploadResult.attachmentId}`);
      console.log(`📸 Image URL: ${uploadResult.url || 'URL not available'}`);
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
 * Creates a forum post announcing a new place using the correct Whop API
 */
export async function createPlaceAnnouncementPost({
  place,
  experienceId,
  userId,
  bizId,
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

    // Create Whop public URL format: whop.com/{bizName}/{experienceTitle}-{expIdWithoutPrefix}
    const bizNameUrl = urlFriendly(experience.bizName);
    const experienceTitleUrl = urlFriendly(experience.title);
    const expIdWithoutPrefix = experienceId.slice(4); // Remove "exp_" prefix
    const mapUrl = `https://whop.com/${bizNameUrl}/${experienceTitleUrl}-${expIdWithoutPrefix}/app`;

    // Get Mapbox Static image URL
    const staticImageUrl = await getMapboxStaticImage(
      place.latitude,
      place.longitude,
      place.name
    );

    // Upload the image to Whop if we have a static image URL
    let attachmentId: string | null = null;
    if (staticImageUrl) {
      console.log(`🔄 Uploading map image for place: ${place.name}`);
      attachmentId = await uploadImageToWhop(staticImageUrl, userId, bizId);
      
      if (attachmentId) {
        console.log(`✅ Image uploaded successfully with ID: ${attachmentId}`);
      } else {
        console.log(`❌ Image upload failed, will include URL in post instead`);
      }
    }

    // First, try to create the "Places Forum" (it's ok if it already exists)
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
      
      forumId = forumResult.createForum?.id || null;
      console.log(`✅ Created or found Places Forum: ${forumId}`);
    } catch (error: any) {
      // Forum might already exist, we'll try to find it by using a different approach
      console.log("Forum might already exist, continuing with post creation...");
      // For now, we'll use the experienceId as forumId - adjust this based on your setup
      forumId = experienceId;
    }

    if (!forumId) {
      console.error("Could not create or find forum");
      return;
    }

    // Create the forum post content 
    const addressText = place.address 
      ? `Address: ${place.address}`
      : `Coordinates: ${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;

    const categoryText = place.category ? `Category: ${place.category}` : null;
    const descriptionText = place.description ? `Description: ${place.description}` : null;
	const mapUrlText = `🔗 View on Map: ${mapUrl}`;

    // Customize content based on whether we have an attachment
    const postContent = `A new place has been added to the map! 🗺️
${addressText}
${categoryText}
${descriptionText}

${mapUrlText}
${attachmentId ? '📸 See the map location in the image attached below!' : (staticImageUrl ? `📸 **Location Preview**: ${staticImageUrl}` : '')}

`;

    // Prepare the forum post input
    const forumPostInput: any = {
      forumExperienceId: forumId,
      title: `📍 New Place Added: ${place.name}`,
      content: postContent,
      isMention: true, // This notifies all members
    };

    // Add attachment if we successfully uploaded the image
    if (attachmentId) {
      forumPostInput.attachments = [
        {
          directUploadId: attachmentId,
        },
      ];
      console.log(`✅ Including image attachment with directUploadId: ${attachmentId}`);
    }

    // Create the forum post using the app's identity (not individual user)
    const postResult = await whopApi
      .withCompany(bizId)
      .createForumPost({
        input: forumPostInput,
      });

    if (postResult.createForumPost) {
      console.log(`✅ Successfully created forum post for place: ${place.name}`);
      console.log(`📝 Post ID: ${postResult.createForumPost.id}`);
      if (attachmentId) {
        console.log(`📸 With image attachment: ${attachmentId}`);
      } else if (staticImageUrl) {
        console.log(`📸 With image URL in content: ${staticImageUrl}`);
      }
    }

  } catch (error) {
    console.error("Error creating place announcement post:", error);
    
    // Get experience details for fallback URL generation
    let mapUrl = `https://whop.com/experiences/${experienceId}`; // Default fallback
    
    try {
      const experience = await prisma.experience.findUnique({
        where: { id: experienceId },
      });
      
      if (experience) {
        // Helper function to make strings URL-friendly
        const urlFriendly = (str: string) => 
          str.toLowerCase()
             .replace(/\s+/g, '-')
             .replace(/[^a-z0-9-]/g, '')
             .replace(/-+/g, '-')
             .replace(/^-|-$/g, '');

        // Create Whop public URL format for fallback too
        const bizNameUrl = urlFriendly(experience.bizName);
        const experienceTitleUrl = urlFriendly(experience.title);
        const expIdWithoutPrefix = experienceId.slice(4); // Remove "exp_" prefix
        mapUrl = `https://whop.com/${bizNameUrl}/${experienceTitleUrl}-${expIdWithoutPrefix}/app`;
      }
    } catch (urlError) {
      console.error("Error generating fallback URL:", urlError);
    }
    
    // Get Mapbox Static image URL for fallback
    const staticImageUrl = await getMapboxStaticImage(
      place.latitude,
      place.longitude,
      place.name
    );
    
    // Fallback: Log notification details even if forum post fails
    console.log(`=== New Place Notification (Forum Post Failed) ===`);
    console.log(`Title: 📍 New Place Added: ${place.name}`);
    
    const addressText = place.address ? `Address: ${place.address}` : `Coordinates: ${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
    const categoryText = place.category ? `Category: ${place.category}` : '';
    const descriptionText = place.description ? `Description: ${place.description}` : '';
    
    console.log(`Content: A new place has been added!`);
    console.log(`${addressText}`);
    if (categoryText) console.log(categoryText);
    if (descriptionText) console.log(descriptionText);
    console.log(`Map URL: ${mapUrl}`);
    if (staticImageUrl) console.log(`Image URL: ${staticImageUrl}`);
    
    // Send webhook notification if configured
    if (process.env.DEFAULT_WEBHOOK_URL) {
      try {
        await fetch(process.env.DEFAULT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📍 New place added: **${place.name}**\n${addressText}\n🔗 View: ${mapUrl}`
          })
        });
        console.log(`✅ Webhook notification sent successfully`);
      } catch (webhookError) {
        console.error("Webhook notification failed:", webhookError);
      }
    }
  }
}