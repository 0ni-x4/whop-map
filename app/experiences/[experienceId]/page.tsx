import ExperiencePrompt from "@/components/ExperiencePrompt";
import { findOrCreateExperience } from "@/lib/helpers";
import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";

export default async function ExperiencePage({
  params,
}: {
  params: { experienceId: string };
}) {
  const headersList = await headers();
  const { userId } = await verifyUserToken(headersList);

  const experience = await findOrCreateExperience(params.experienceId);

  const hasAccess = await whopApi.CheckIfUserHasAccessToExperience({
    userId,
    experienceId: params.experienceId,
  });

  return (
    <div className="flex flex-col gap-4 p-4 h-screen items-center justify-center">
      <ExperiencePrompt
        prompt={experience.prompt}
        accessLevel={hasAccess.hasAccessToExperience.accessLevel}
        experienceId={params.experienceId}
      />
    </div>
  );
}
