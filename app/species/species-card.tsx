"use client";
// Client component: it is rendered from the client-side SpeciesList and hosts the detail, edit and delete dialogs.

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import DeleteSpeciesButton from "./delete-species-button";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesDetailDialog from "./species-detail-dialog";
import type { SpeciesWithAuthor } from "./types";

const PREVIEW_LENGTH = 150;

// First 150 characters of the description, with an ellipsis only when something was actually cut off
function previewDescription(description: string | null) {
  if (!description) return "";
  return description.length > PREVIEW_LENGTH ? description.slice(0, PREVIEW_LENGTH).trim() + "..." : description;
}

export default function SpeciesCard({ species, sessionId }: { species: SpeciesWithAuthor; sessionId: string }) {
  return (
    <div className="m-4 w-72 min-w-72 flex-none overflow-hidden rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 break-words text-2xl font-semibold">{species.scientific_name}</h3>
      {species.common_name && <h4 className="break-words text-lg font-light italic">{species.common_name}</h4>}
      {species.endangered && (
        <Badge variant="destructive" className="mt-1">
          Endangered
        </Badge>
      )}
      <p className="mt-2 break-words">{previewDescription(species.description)}</p>
      <SpeciesDetailDialog species={species} sessionId={sessionId} />
      {/* Edit/delete are only offered to the author; row-level security enforces the same rule in the database */}
      {species.author === sessionId && (
        <div className="mt-2 flex flex-wrap gap-2 *:flex-1">
          <EditSpeciesDialog species={species} />
          <DeleteSpeciesButton species={species} />
        </div>
      )}
    </div>
  );
}
