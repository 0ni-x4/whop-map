import EditExperiencePage from "@/components/EditExperiencePage";

export default function Page({ params }: { params: { experienceId: string } }) {
  return <EditExperiencePage experienceId={params.experienceId} />;
}
