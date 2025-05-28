import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { createPlace, getPlaces, createPlaceAnnouncementPost } from "@/lib/helpers";

// OPTIMIZATION: Set timeout for Vercel
export const maxDuration = 30;

/**
 * GET /api/experiences/[experienceId]/places
 * Fetches all places for an experience
 * Available to both admins and customers
 */
export async function GET(request: Request) {
  try {
    // Extract experience ID from URL
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/places/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

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

    // Fetch and return places
    const places = await getPlaces(experienceId);
    return NextResponse.json(places);
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}

/**
 * OPTIMIZED: POST /api/experiences/[experienceId]/places
 * Creates a new place with async forum post creation
 * Only available to admin users
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Extract experience ID from URL
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/places/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has ADMIN access (not just customer access)
    const hasAdminAccess = await whopApi.checkIfUserHasAccessToExperience({
      userId: userToken.userId,
      experienceId,
    });

    if (!hasAdminAccess.hasAccessToExperience.hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized, no access" },
        { status: 401 }
      );
    }

    if (hasAdminAccess.hasAccessToExperience.accessLevel !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized, admin access required" },
        { status: 401 }
      );
    }

    // Parse request body
    const { name, description, latitude, longitude, address, category } =
      await request.json();

    // Validate required fields
    if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Creating place: ${name}`);

    // OPTIMIZATION: Create the place first (fast operation)
    const place = await createPlace({
      experienceId,
      name,
      description,
      latitude,
      longitude,
      address,
      category,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Place created in ${duration}ms: ${place.id}`);

    // OPTIMIZATION: Get bizId from experience data for forum post
    try {
      const experienceData = await whopApi.getExperience({ experienceId });
      const bizId = experienceData.experience.company.id;
      
      // Fire and forget forum post creation (don't await)
      setImmediate(() => {
        createPlaceAnnouncementPost({
          place,
          experienceId,
          userId: userToken.userId,
          bizId,
          skipImageUpload: false, // Allow image upload in background
        }).catch(error => {
          console.error("Background forum post creation failed:", error);
        });
      });
      
      console.log(`🔄 Forum post creation started in background`);
    } catch (error) {
      console.error("Failed to get experience data for forum post:", error);
    }

    // Return immediately with the created place
    return NextResponse.json({
      ...place,
      meta: {
        createdIn: duration,
        forumPostQueued: true
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Place creation failed after ${duration}ms:`, error);
    return NextResponse.json(
      { error: "Failed to create place" },
      { status: 500 }
    );
  }
} 