import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { createPlace, getPlaces, createPlaceAnnouncementPost } from "@/lib/helpers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/places/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)\/places/);
    const experienceId = match ? match[1] : null;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Missing experienceId" },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { name, description, latitude, longitude, address, category } =
      await request.json();

    if (!name || typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const place = await createPlace({
      experienceId,
      name,
      description,
      latitude,
      longitude,
      address,
      category,
    });

    // Get business information for forum post
    const experience = await whopApi.getExperience({ experienceId });
    const bizId = experience.experience.company.id;

    // Create forum post announcement (async, don't wait for completion)
    createPlaceAnnouncementPost({
      place,
      experienceId,
      userId: userToken.userId,
      bizId,
    }).catch(error => {
      console.error("Failed to create forum post:", error);
      // Don't fail the API call if forum post fails
    });

    return NextResponse.json(place);
  } catch (error) {
    console.error("Error creating place:", error);
    return NextResponse.json(
      { error: "Failed to create place" },
      { status: 500 }
    );
  }
} 