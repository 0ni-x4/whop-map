import ExperiencePrompt from "@/components/ExperiencePrompt";

import { findOrCreateExperience } from "@/lib/helpers";
import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";

export default async function GeneratorPage({
  params,
}: {
  params: Promise<{ experienceId: string; accessPassId: string }>;
}) {
  const { experienceId } = await params;

  const headersList = await headers();
  // // For a real integration, you would validate the token to get the Whop user ID.
  const { userId } = await verifyUserToken(headersList);

  const experience = await findOrCreateExperience(experienceId);

  const hasAccess = await whopApi.CheckIfUserHasAccessToExperience({
    userId,
    experienceId,
  });

  return (
    <div className="flex flex-col gap-4 p-4 h-screen items-center justify-center">
      <ExperiencePrompt
        prompt={experience.prompt}
        accessLevel={hasAccess.hasAccessToExperience.accessLevel}
        experienceId={experienceId}
      />
    </div>
  );
}
