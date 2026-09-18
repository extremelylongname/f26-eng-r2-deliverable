import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { getCurrentUser } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AnimalSpeedGraph from "./animal-speed-graph";

export default async function SpeciesSpeedPage() {
  const user = await getCurrentUser();

  if (!user) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species Speed</TypographyH2>
      </div>
      <Separator className="my-4" />
      <section className="mb-8">
        <h3 className="mb-2 text-2xl font-bold">How Fast Are Animals?</h3>
        <p className="text-muted-foreground">
          The animal kingdom is full of speedsters, from the lightning-fast cheetah to the surprisingly swift pronghorn.
          Not all animals are built for speed, though: carnivores often rely on bursts of speed to catch prey,
          herbivores may need to outrun predators, and omnivores fall somewhere in between. The graph below compares the
          top speeds of animals grouped by diet. Hover a bar for details, filter by diet, or switch to the table view to
          read the exact values.
        </p>
      </section>
      <AnimalSpeedGraph />
    </>
  );
}
