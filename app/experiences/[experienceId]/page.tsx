import ExperiencePrompt from "@/components/ExperiencePrompt";
import { Button } from "@/components/ui/button";

import { findOrCreateExperience } from "@/lib/helpers";
import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import Link from "next/link";

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string; accessPassId: string }>;
  searchParams: Promise<{ accessPassId: string }>;
}) {
  const { experienceId } = await params;

  const headersList = await headers();
  // // For a real integration, you would validate the token to get the Whop user ID.
  const { userId } = await verifyUserToken(headersList);

  await findOrCreateExperience(experienceId);

  const hasAccess = await whopApi.CheckIfUserHasAccessToExperience({
    userId,
    experienceId,
  });

  if (hasAccess.hasAccessToExperience.accessLevel === "no_access") {
    return <div>Unable to authenticate</div>;
  }

  return (
    <div className="flex flex-col max-w-[500px] my-auto mx-auto gap-6 p-4 h-screen items-center justify-center">
      <div className="text-4xl font-bold text-center">
        Welcome to{" "}
        {hasAccess.hasAccessToExperience.accessLevel === "admin"
          ? "your"
          : "my"}{" "}
        generator.
      </div>
      {hasAccess.hasAccessToExperience.accessLevel === "admin" ? (
        <div className="text-center">
          At any given time, you can submit a prompt for everyone in your
          community to generate an image.
        </div>
      ) : (
        <div className="text-center">
          At any given time, I will submit a prompt for everyone in my community
          to generate an image.
        </div>
      )}
      <div className="flex flex-col gap-4 w-full">
        <Link
          className="w-full"
          href={`/experiences/${experienceId}/generator`}
        >
          <Button className="w-full">Begin</Button>
        </Link>
        {hasAccess.hasAccessToExperience.accessLevel !== "admin" && (
          <Link
            className="w-full"
            target="_blank"
            href={`https://whop.com/apps/${process.env.WHOP_APP_ID}/install/`}
          >
            <Button variant="outline" className="w-full">
              Install app in your whop
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
