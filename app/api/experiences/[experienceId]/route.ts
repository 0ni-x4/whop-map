import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/experiences\/([^/]+)/);
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

    const hasAccess = await whopApi.CheckIfUserHasAccessToExperience({
      userId: userToken.userId,
      experienceId,
    });

    if (!hasAccess.hasAccessToExperience.hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized, no access" },
        { status: 401 }
      );
    }

    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: { places: true },
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(experience);
  } catch (error) {
    console.error("Error fetching experience:", error);
    return NextResponse.json(
      { error: "Failed to fetch experience" },
      { status: 500 }
    );
  }
}
