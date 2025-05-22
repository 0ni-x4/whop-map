import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { md5 as jsMd5 } from "js-md5";

export async function POST(
  request: Request,
  { params }: { params: { experienceId: string } }
) {
  try {
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    console.log(userToken);
    //  if (!userToken) {
    //    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    //  }

    const { imageData, prompt } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer to get size
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const response = await whopApi.UploadAttachment({
      file: new Blob([imageBuffer], { type: "image/png" }),
      record: "forum_post",
    });

    const attachmentId = response.id;

    const forum = await whopApi.CreateForum({
      input: { experienceId: params.experienceId, name: "AI Uploads" },
    });

    const forumId = forum.createForum?.id;

    const post = await whopApi.CreateForumPost({
      input: {
        experienceId: params.experienceId,
        content: prompt,
        attachments: [{ id: attachmentId }],
      },
    });

    const postId = post.createForumPost?.id;

    return NextResponse.json({
      success: true,
      attachmentId,
      forumId,
      postId,
    });
  } catch (error) {
    console.error("Error getting upload URL:", error);
    return NextResponse.json(
      { error: "Failed to get upload URL" },
      { status: 500 }
    );
  }
}
