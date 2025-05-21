import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { experienceId: string } }
) {
  try {
    const { prompt } = await request.json();
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const hasAccess = await whopApi.HasAccessToExperience({
      userId: userToken.userId,
      experienceId: params.experienceId,
    });
    if (hasAccess.hasAccessToExperience.accessLevel != "admin") {
      return NextResponse.json(
        { error: "Unauthorized, not admin" },
        { status: 401 }
      );
    }

    const updatedExperience = await prisma.experience.update({
      where: {
        id: params.experienceId,
      },
      data: {
        prompt,
      },
    });

    return NextResponse.json(updatedExperience);
  } catch (error) {
    console.error("Error updating experience:", error);
    return NextResponse.json(
      { error: "Failed to update experience" },
      { status: 500 }
    );
  }
}
