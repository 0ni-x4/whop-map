"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Loader from "./Loader";

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
      const response = await fetch(
        `/api/experiences/${experienceId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageData,
            prompt,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      setImage(data.imageUrl);
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
    } catch (error) {
      console.error("Failed to copy image URL:", error);
    }
  };

  if (isGenerating) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 space-y-8">
        <div className="w-full aspect-square flex items-center justify-center">
          <Loader />
        </div>
        <div className="flex gap-4">
          <Button onClick={handleReset} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button disabled className="flex-1">
            Generating...
          </Button>
        </div>
      </div>
    );
  }

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
              />
            </div>
          )}
          <div className="flex gap-4">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reset
            </Button>
            <Button
              onClick={hasGenerated ? handleCopy : handleGenerate}
              className="flex-1"
            >
              {hasGenerated ? "Copy Image URL" : "Generate Image"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
