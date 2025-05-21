"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const MULTIPART_UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUploader({
  experienceId,
  prompt,
}: {
  experienceId: string;
  prompt: string;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setHasGenerated(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
  });

  const handleUpload = async (imageData: string) => {
    try {
      // Get upload URL and configuration
      const response = await fetch(`/api/experiences/${experienceId}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { mediaDirectUpload } = await response.json();
      const isMultipart = imageData.length > MULTIPART_UPLOAD_CHUNK_SIZE;

      if (isMultipart && mediaDirectUpload.multipartUploadUrls) {
        // Handle multipart upload
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        const chunks: Buffer[] = [];

        for (
          let i = 0;
          i < imageBuffer.length;
          i += MULTIPART_UPLOAD_CHUNK_SIZE
        ) {
          chunks.push(imageBuffer.slice(i, i + MULTIPART_UPLOAD_CHUNK_SIZE));
        }

        const uploadPromises = mediaDirectUpload.multipartUploadUrls.map(
          async (part: { partNumber: number; url: string }) => {
            const chunk = chunks[part.partNumber - 1];
            if (!chunk) {
              throw new Error(`Missing chunk for part ${part.partNumber}`);
            }

            const uploadResponse = await fetch(part.url, {
              method: "PUT",
              headers: {
                ...mediaDirectUpload.headers,
                "Content-Type": "image/png",
              },
              body: chunk,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload part ${part.partNumber}`);
            }

            const etag = uploadResponse.headers.get("ETag");
            if (!etag) {
              throw new Error(`No ETag received for part ${part.partNumber}`);
            }

            setUploadProgress(
              (prev) =>
                prev + 100 / mediaDirectUpload.multipartUploadUrls.length
            );
            return {
              partNumber: part.partNumber,
              etag: etag.replace(/"/g, ""),
            };
          }
        );
      } else {
        // Handle simple upload
        const uploadResponse = await fetch(mediaDirectUpload.uploadUrl, {
          method: "PUT",
          headers: {
            ...mediaDirectUpload.headers,
            "Content-Type": "image/png",
          },
          body: imageData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }
        setUploadProgress(100);
      }

      // Create forum post
      const forumPostResponse = await fetch(
        "https://data.whop.com/public-graphql",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_WHOP_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
            mutation CreateForumPost($input: CreateForumPostInput!) {
              createForumPost(input: $input) {
                experience {
                  id
                }
              }
            }
          `,
            variables: {
              input: {
                experienceId,
                forumPost: {
                  content: prompt || "Generated image post",
                  feedType: "forum_feed",
                  fileAttachments: [
                    {
                      id: mediaDirectUpload.id,
                    },
                  ],
                },
              },
            },
          }),
        }
      );

      if (!forumPostResponse.ok) {
        throw new Error("Failed to create forum post");
      }

      setHasGenerated(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    setIsGenerating(true);
    setUploadProgress(0);
    try {
      await handleUpload(image);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setHasGenerated(false);
    setUploadProgress(0);
  };

  const handleCopy = async () => {
    if (!image) return;
    try {
      await navigator.clipboard.writeText(image);
      // You might want to add a toast notification here
    } catch (error) {
      console.error("Failed to copy image URL:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400"
          }`}
      >
        <input {...getInputProps()} capture="environment" />
        {image ? (
          <div className="relative w-full aspect-square">
            <Image
              src={image}
              alt="Uploaded image"
              fill
              className="object-contain rounded-lg"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">📸</div>
            <p className="text-gray-600">
              {isDragActive
                ? "Drop the image here..."
                : "Drag & drop an image here, or click to select"}
            </p>
            <p className="text-sm text-gray-500">Supports JPG, PNG, GIF</p>
          </div>
        )}
      </div>

      {image && (
        <div className="flex flex-col gap-4">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          <div className="flex gap-4">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reset
            </Button>
            <Button
              onClick={hasGenerated ? handleCopy : handleGenerate}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating
                ? "Uploading..."
                : hasGenerated
                ? "Copy Image URL"
                : "Upload Image"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
