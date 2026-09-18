"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useState } from "react";
import SpeciesCard from "./species-card";
import type { SpeciesWithAuthor } from "./types";

// Case-insensitive substring match over the searchable text fields; null fields never match
function matchesQuery(species: SpeciesWithAuthor, query: string) {
  return [species.scientific_name, species.common_name, species.description].some(
    (field) => field?.toLowerCase().includes(query),
  );
}

export default function SpeciesList({ species, sessionId }: { species: SpeciesWithAuthor[]; sessionId: string }) {
  const [query, setQuery] = useState("");

  // Filtering runs on the already-fetched list, so typing never triggers a server round trip
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery === "" ? species : species.filter((s) => matchesQuery(s, normalizedQuery));

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by scientific name, common name, or description"
            id="species-search"
            aria-label="Search species"
            className="pl-9 pr-10"
          />
          {query !== "" && (
            <Button
              type="button"
              variant="ghost"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {matches.length} of {species.length} species
        </p>
      </div>
      {matches.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {normalizedQuery === "" ? "No species have been added yet." : `No species match "${query.trim()}".`}
        </p>
      ) : (
        <div className="flex flex-wrap justify-center">
          {matches.map((s) => (
            <SpeciesCard key={s.id} species={s} sessionId={sessionId} />
          ))}
        </div>
      )}
    </>
  );
}
