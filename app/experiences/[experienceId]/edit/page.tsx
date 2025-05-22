import EditExperiencePage from "@/components/EditExperiencePage";

export default async function Page({
  params,
}: {
  params: Promise<{ experienceId: string; accessPassId: string }>;
}) {
  const { experienceId } = await params;
  return <EditExperiencePage experienceId={experienceId} />;
}
