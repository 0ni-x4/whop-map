import Link from "next/link";
import ImageUploader from "./ImageUploader";
import { Button } from "./ui/button";

export default function ExperiencePrompt({
  prompt,
  accessLevel,
  experienceId,
}: {
  prompt: string;
  accessLevel: "admin" | "customer" | "no_access";
  experienceId: string;
}) {
  return (
    <div>
      <div className="flex justify-center items-center">
        <div className="text-4xl font-bold">
          {prompt ? `"${prompt}"` : "Creator has not set a prompt yet."}
        </div>
      </div>
      {accessLevel === "admin" && (
        <div className="flex justify-center items-center">
          <Link href={`/experiences/${experienceId}/edit`}>
            <Button variant={"link"}>Edit prompt</Button>
          </Link>
        </div>
      )}
      {prompt ? (
        <ImageUploader prompt={prompt} experienceId={experienceId} />
      ) : null}
    </div>
  );
}
