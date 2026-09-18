"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useRef } from "react";
import SpeciesComments from "./species-comments";
import type { SpeciesWithAuthor } from "./types";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default function SpeciesDetailDialog({ species, sessionId }: { species: SpeciesWithAuthor; sessionId: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full" aria-label={`Learn more about ${species.scientific_name}`}>
          Learn More
        </Button>
      </DialogTrigger>
      {/* Dialog content (and the comments fetch inside it) only mounts while the dialog is open. Initial focus goes
          to the title: the first tabbable element would otherwise be the comment box at the very bottom */}
      <DialogContent
        className="max-h-dvh overflow-y-auto sm:max-w-[600px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        {species.image && (
          <div className="relative h-56 w-full overflow-hidden rounded-md">
            <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
          </div>
        )}
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {species.scientific_name}
          </DialogTitle>
          <DialogDescription className="italic">{species.common_name ?? "No common name"}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge>{species.kingdom}</Badge>
          {species.endangered ? (
            <Badge variant="destructive">Endangered</Badge>
          ) : (
            <Badge variant="secondary">Not endangered</Badge>
          )}
        </div>
        <Separator />
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Fact label="Total population" value={species.total_population?.toLocaleString() ?? "Unknown"} />
          <Fact label="Kingdom" value={species.kingdom} />
          <Fact label="Endangered" value={species.endangered ? "Yes" : "No"} />
        </dl>
        <Separator />
        <section className="space-y-1">
          <h3 className="text-base font-semibold">Description</h3>
          <p className="whitespace-pre-wrap break-words text-sm">{species.description ?? "No description provided"}</p>
        </section>
        <Separator />
        <section className="space-y-1">
          <h3 className="text-base font-semibold">Added by</h3>
          {species.profiles ? (
            <>
              <p className="break-words text-sm font-medium">{species.profiles.display_name}</p>
              <p className="break-all text-sm text-muted-foreground">{species.profiles.email}</p>
              {species.profiles.biography && <p className="text-sm">{species.profiles.biography}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unknown author</p>
          )}
        </section>
        <Separator />
        <SpeciesComments speciesId={species.id} sessionId={sessionId} />
      </DialogContent>
    </Dialog>
  );
}
