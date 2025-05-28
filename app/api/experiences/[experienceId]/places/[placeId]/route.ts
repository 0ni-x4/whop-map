import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { deletePlace } from "@/lib/helpers";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/experiences\/([^/]+)\/places\/([^/]+)/);
    const experienceId = pathMatch ? pathMatch[1] : null;
    const placeId = pathMatch ? pathMatch[2] : null;

    if (!experienceId || !placeId) {
      return NextResponse.json(
        { error: "Missing experienceId or placeId" },
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

    await deletePlace(placeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting place:", error);
    return NextResponse.json(
      { error: "Failed to delete place" },
      { status: 500 }
    );
  }
} 