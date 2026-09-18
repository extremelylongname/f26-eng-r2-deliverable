"use client";

import { Icons } from "@/components/icons";
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import SpeciesForm, { reportSpeciesError } from "./species-form";
import { emptySpeciesFormValues, type SpeciesFormData } from "./species-schema";

export default function AddSpeciesDialog({ userId }: { userId: string }) {
  const router = useRouter();

  // Control open/closed state of the dialog
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: SpeciesFormData) => {
    // `data` has already been validated and transformed by zod, so it can go straight into the insert
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").insert([{ ...data, author: userId }]);

    // A duplicate name is shown under the field and other errors in a toast; the dialog stays open either way
    if (error) return reportSpeciesError(error);

    // Closing the dialog unmounts the form, so the next open starts from the empty values again
    setOpen(false);

    // Refresh the server components on this route so the new species shows up in the list
    router.refresh();

    toast({ title: "New species added!", description: "Successfully added " + data.scientific_name + "." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Icons.add className="mr-3 h-5 w-5" />
          Add Species
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Species</DialogTitle>
          <DialogDescription>
            Add a new species here. Click &quot;Add Species&quot; below when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <SpeciesForm
          defaultValues={emptySpeciesFormValues}
          onSubmit={onSubmit}
          submitLabel="Add Species"
          wikipediaAutofill
        />
      </DialogContent>
    </Dialog>
  );
}
