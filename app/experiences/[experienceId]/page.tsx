import { findOrCreateExperience } from "@/lib/helpers";
import { headers } from "next/headers";
import { whopApi, verifyUserToken } from "@/lib/whop-api";
import MapView from "@/components/MapView";

interface PageProps {
  params: Promise<{ experienceId: string }>;
}

export default async function ExperiencePage({ params }: PageProps) {
  const { experienceId } = await params;
  const headersList = await headers();
  const userToken = await verifyUserToken(headersList);

  if (!userToken) {
    return <div>Please log in to access this experience.</div>;
  }

  const experience = await findOrCreateExperience(experienceId);

  const hasAccess = await whopApi.CheckIfUserHasAccessToExperience({
    userId: userToken.userId,
    experienceId: experienceId,
  });

  if (!hasAccess.hasAccessToExperience.hasAccess) {
    return <div>You don't have access to this experience.</div>;
  }

  return (
    <div className="flex flex-col h-screen relative">
      {/* Compact info card in top-left corner */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-lg max-w-xs">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{experience.title}</h1>
        <p className="text-xs text-gray-600">
          {hasAccess.hasAccessToExperience.accessLevel === "admin" 
            ? "Admin access"
            : "View only"}
        </p>
      </div>

      <div className="flex-1">
        <MapView
          places={experience.places || []}
          accessLevel={hasAccess.hasAccessToExperience.accessLevel as "admin" | "customer" | "no_access"}
          experienceId={experienceId}
        />
      </div>
    </div>
  );
}
