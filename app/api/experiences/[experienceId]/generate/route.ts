import { NextResponse } from "next/server";
import { verifyUserToken, whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import OpenAI from "openai";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: Request,
  { params }: { params: { experienceId: string } }
) {
  try {
    const headersList = await headers();
    const userToken = await verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await whopApi.HasAccessToExperience({
      userId: userToken.userId,
      experienceId: params.experienceId,
    });

    if (!hasAccess.hasAccessToExperience.hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized, no access" },
        { status: 401 }
      );
    }

    const { image } = await request.json();

    const experience = await prisma.experience.findUnique({
      where: {
        id: params.experienceId,
      },
    });

    if (!image || !experience?.prompt) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }
      );
    }

    // Extract image format from base64 string
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,/);
    if (!matches || !matches[1]) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }
    const imageFormat = matches[1];

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Log original image information
    console.log("Original Image Format:", imageFormat);
    console.log("Original Buffer Size:", imageBuffer.length, "bytes");

    // Convert to PNG using sharp
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();

    console.log("PNG Buffer Size:", pngBuffer.length, "bytes");

    // Create a File object from the PNG buffer
    const file = new File([pngBuffer], "image.png", {
      type: "image/png",
    });

    // Log File object information
    console.log("File Size:", file.size, "bytes");
    console.log("File Type:", file.type);
    console.log("File Name:", file.name);

    // Generate image using DALL-E with prompt
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: file,
      prompt: experience.prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    console.log("Response:", response);

    // Get the base64 image data from the response
    const base64Image = response.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new Error("No image data returned from OpenAI");
    }

    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
