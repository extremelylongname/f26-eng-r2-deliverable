"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SpeciesForm, { reportSpeciesError } from "./species-form";
import { type SpeciesFormData } from "./species-schema";
import { type Species } from "./types";

export default function EditSpeciesDialog({ species }: { species: Species }) {
  const router = useRouter();

  // Control open/closed state of the dialog
  const [open, setOpen] = useState(false);

  // Memoized so the form only resets when the stored row actually changes (e.g. after a refresh), not on every render
  const defaultValues = useMemo<SpeciesFormData>(
    () => ({
      scientific_name: species.scientific_name,
      common_name: species.common_name,
      kingdom: species.kingdom,
      total_population: species.total_population,
      image: species.image,
      description: species.description,
      endangered: species.endangered,
    }),
    [species],
  );

  const onSubmit = async (data: SpeciesFormData) => {
    // Row-level security also rejects this update for anyone other than the author
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("species")
      .update({ ...data })
      .eq("id", species.id);

    // A duplicate name is shown under the field and other errors in a toast; the dialog stays open either way
    if (error) return reportSpeciesError(error);

    setOpen(false);

    // Refresh the server components on this route so the card and detail view show the edited values
    router.refresh();

    toast({ title: "Species updated", description: "Successfully updated " + data.scientific_name + "." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" aria-label={`Edit ${species.scientific_name}`}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Species</DialogTitle>
          <DialogDescription>
            Update the details of this species. Only the author of an entry can edit it. Click &quot;Save Changes&quot;
            below when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <SpeciesForm defaultValues={defaultValues} onSubmit={onSubmit} submitLabel="Save Changes" />
      </DialogContent>
    </Dialog>
  );
}
