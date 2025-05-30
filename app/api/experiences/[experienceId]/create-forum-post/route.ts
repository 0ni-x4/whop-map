import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";

/**
 * POST /api/experiences/[experienceId]/create-forum-post
 * Client-side forum post creation
 * This endpoint receives place data from client and creates forum post
 */
export async function POST(request: Request) {
  console.log(`🌐 === CLIENT FORUM POST API START ===`);
  
  try {
    // Extract experience ID from URL
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/create-forum-post/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    console.log(`📍 Experience ID: ${experienceId}`);

    // Verify user authentication
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin access
    const hasAccess = await whopApi.checkIfUserHasAccessToExperience({
      userId: userToken.userId,
      experienceId,
    });

    if (hasAccess.hasAccessToExperience.accessLevel !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized, admin access required" },
        { status: 401 }
      );
    }

    console.log(`✅ Admin access verified`);

    // Parse request body
    const { placeName, placeDescription, address, category, attachmentId } = await request.json();

    console.log(`📝 Forum post data:`, {
      placeName,
      placeDescription: placeDescription?.substring(0, 50) + '...',
      address: address?.substring(0, 50) + '...',
      category,
      attachmentId: attachmentId?.substring(0, 20) + '...'
    });

    // Step 1: Get experience details
    console.log(`📋 Step 1: Getting experience details...`);
    const step1Start = Date.now();
    
    const whopExperience = await whopApi.getExperience({ experienceId });
    const experienceName = whopExperience.experience.name;
    const bizId = whopExperience.experience.company.id;
    
    console.log(`✅ Step 1 completed in ${Date.now() - step1Start}ms`);
    console.log(`🏢 Experience: ${experienceName}, Biz: ${bizId}`);

    // Step 2: Generate app URL (using correct whop.com format)
    console.log(`🔗 Step 2: Generating app URL...`);
    
    // Helper function to create URL-friendly strings
    const urlFriendly = (str: string) => str
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create Whop public URL format
    const bizNameUrl = urlFriendly(whopExperience.experience.company.title);
    const experienceTitleUrl = urlFriendly(experienceName);
    const expIdWithoutPrefix = experienceId.slice(4);
    const mapUrl = `https://whop.com/${bizNameUrl}/${experienceTitleUrl}-${expIdWithoutPrefix}/app`;
    
    console.log(`✅ Step 2 completed - URL: ${mapUrl}`);

    // Step 3: Create forum content (NO MARKDOWN - plain text only)
    console.log(`📝 Step 3: Creating forum content...`);
    let content = `\n`;
    content += `A new place has been added to the map! 🗺️\n\n`;
    
    if (address) {
      content += `Address: ${address}\n`;
    }
    if (category) {
      content += `Category: ${category}\n`;
    }
    if (placeDescription) {
      content += `Description: ${placeDescription}\n`;
    }
    
    content += `\nView on Map: ${mapUrl}\n\n`;
    content += `Click the link above to explore this location and all other places on our interactive map!`;
    
    console.log(`✅ Step 3 completed - Content: ${content.length} chars`);

    // Step 4: Create/find Places Forum
    console.log(`🏛️ Step 4: Finding or creating Places Forum...`);
    const step4Start = Date.now();
    
    let placesForumId: string;
    
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
      
      placesForumId = forumResult.createForum?.id || experienceId;
      console.log(`✅ Found/created Places Forum: ${placesForumId}`);
    } catch (error) {
      console.error(`❌ Forum creation/finding failed:`, error);
      // Use experienceId as fallback
      placesForumId = experienceId;
      console.log(`⚠️ Using experienceId as forum fallback: ${placesForumId}`);
    }
    
    console.log(`✅ Step 4 completed in ${Date.now() - step4Start}ms`);

    // Step 5: Create forum post
    console.log(`📤 Step 5: Creating forum post...`);
    const step5Start = Date.now();
    
    const forumPostInput: any = {
      forumExperienceId: placesForumId,
      title: `📍 New Place Added: ${placeName}`,
      content,
      isMention: true, // Notify all members
    };

    // Add attachment if provided
    if (attachmentId) {
      console.log(`📎 Including attachment: ${attachmentId}`);
      forumPostInput.attachments = [
        {
          directUploadId: attachmentId,
        },
      ];
    }

    const forumPost = await whopApi
      .withCompany(bizId)
      .createForumPost({
        input: forumPostInput,
      });
    
    console.log(`✅ Step 5 completed in ${Date.now() - step5Start}ms`);
    console.log(`📝 Forum post created: ${forumPost.createForumPost?.id}`);
    console.log(`🎯 === CLIENT FORUM POST API COMPLETE ===`);

    return NextResponse.json({
      success: true,
      postId: forumPost.createForumPost?.id,
      forumId: placesForumId,
    });

  } catch (error) {
    console.error("❌ Error creating forum post:", error);
    return NextResponse.json(
      { 
        error: "Failed to create forum post",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 