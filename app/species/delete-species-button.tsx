"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Species } from "./types";

export default function DeleteSpeciesButton({ species }: { species: Species }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const deleteSpecies = async () => {
    setDeleting(true);
    // Comments are removed by the database cascade; row-level security rejects this for anyone but the author
    const { error } = await createBrowserSupabaseClient().from("species").delete().eq("id", species.id);
    setDeleting(false);

    if (error) {
      toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
      return;
    }

    setDeleted(true);
    setOpen(false);
    toast({ title: "Species deleted", description: "Removed " + species.scientific_name + "." });

    // Refresh the server components on this route so the card disappears from the list
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" aria-label={`Delete ${species.scientific_name}`}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      {/* After a delete the trigger vanishes with its card, so focus goes to the search box instead of back to it */}
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!deleted) return;
          event.preventDefault();
          document.getElementById("species-search")?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {species.scientific_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the species and its comments. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          {/* preventDefault keeps the dialog open until the delete has finished */}
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void deleteSpecies();
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
