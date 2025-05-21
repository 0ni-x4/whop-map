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

    // Create direct upload mutation
    const response = await fetch("https://data.whop.com/public-graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        "x-on-behalf-of": process.env.MY_USER_ID ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation mediaDirectUpload($input: DirectUploadInput!) {
            mediaDirectUpload(input: $input) {
              id
              uploadUrl
              headers
              multipartUploadId
              multipartUploadUrls {
                partNumber
                url
              }
            }
          }
        `,
        variables: {
          input: {
            filename: `generated-image-${Date.now()}.png`,
            contentType: "image/png",
            byteSizeV2: imageBuffer.length,
            checksum: await md5(imageBuffer).then(b64Raw),
            record: "forum_post",
          },
        },
      }),
    });

    const data = await response.json();
    console.log(data);
    console.log("direct upload");

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || "Failed to get upload URL");
    }

    const { mediaDirectUpload } = data.data;
    console.log(mediaDirectUpload);

    return NextResponse.json({
      success: true,
      mediaDirectUpload,
      prompt,
    });
  } catch (error) {
    console.error("Error getting upload URL:", error);
    return NextResponse.json(
      { error: "Failed to get upload URL" },
      { status: 500 }
    );
  }
}

export async function md5(stream: Buffer) {
  const hasher = jsMd5.create();
  hasher.update(stream);
  console.log(hasher.arrayBuffer());
  return hasher.arrayBuffer();
}

const encodings =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function b64Raw(arrayBuffer: ArrayBuffer) {
  let base64 = "";

  const bytes = new Uint8Array(arrayBuffer);
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a: number, b: number, c: number, d: number;
  let chunk: number;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }

  console.log(base64);
  return base64;
}
