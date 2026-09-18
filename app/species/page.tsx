import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesList from "./species-list";

export default async function SpeciesPage() {
  const user = await getCurrentUser();

  if (!user) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  // Join each species with its author's public profile so the detailed view can show who added it
  const { data: species, error } = await createServerSupabaseClient()
    .from("species")
    .select("*, profiles(display_name, email, biography)")
    .order("id", { ascending: false });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        <AddSpeciesDialog userId={user.id} />
      </div>
      <Separator className="my-4" />
      {error ? (
        <p className="text-destructive">Could not load species: {error.message}</p>
      ) : (
        <SpeciesList species={species} sessionId={user.id} />
      )}
    </>
  );
}
