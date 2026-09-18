"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useId, useState } from "react";
import { z } from "zod";

// A malformed image entry is treated as missing rather than failing the whole summary
const imageSchema = z.object({ source: z.string().url(), width: z.number() }).optional().catch(undefined);

// The fields we use from the Wikipedia REST page-summary response
const summarySchema = z.object({
  type: z.string(),
  title: z.string(),
  extract: z.string(),
  thumbnail: imageSchema,
  originalimage: imageSchema,
});

const IMAGE_WIDTH = 500;

export interface WikipediaResult {
  description: string;
  image: string | null;
}

// Drops the API's tracking query string so only the file URL is stored
function withoutQuery(source: string) {
  const url = new URL(source);
  return url.origin + url.pathname;
}

// Wikimedia serves fixed thumbnail widths and refuses to upscale, so the summary's small thumbnail is swapped for a
// 500px one when the original is at least that wide, and for the original itself otherwise
function articleImage({ thumbnail, originalimage }: z.infer<typeof summarySchema>): string | null {
  if (!thumbnail) return null;
  if (!originalimage) return withoutQuery(thumbnail.source);
  return originalimage.width < IMAGE_WIDTH
    ? withoutQuery(originalimage.source)
    : withoutQuery(thumbnail.source).replace(/\/\d+px-/, `/${IMAGE_WIDTH}px-`);
}

export default function WikipediaSearch({ onResult }: { onResult: (result: WikipediaResult) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const inputId = useId();

  const search = async () => {
    const trimmed = query.trim();
    // The input stays enabled (and focused) during a search, so repeat submits are ignored here instead
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          trimmed.replace(/\s+/g, "_"),
        )}?redirect=true`,
      );
      if (response.status === 404) {
        toast({ title: `No Wikipedia article found for "${trimmed}"`, variant: "destructive" });
        return;
      }
      if (!response.ok) {
        toast({
          title: "Something went wrong.",
          description: `Wikipedia returned ${response.status}.`,
          variant: "destructive",
        });
        return;
      }

      const summary = summarySchema.safeParse(await response.json());
      if (!summary.success) {
        toast({
          title: "Something went wrong.",
          description: "Unexpected response from Wikipedia.",
          variant: "destructive",
        });
        return;
      }
      if (summary.data.type === "disambiguation") {
        toast({
          title: `"${summary.data.title}" could mean several things.`,
          description: "Try a more specific name, such as the scientific name.",
          variant: "destructive",
        });
        return;
      }

      onResult({ description: summary.data.extract, image: articleImage(summary.data) });
      toast({ title: "Autofilled from Wikipedia: " + summary.data.title });
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: error instanceof Error ? error.message : "Could not reach Wikipedia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Search Wikipedia by scientific or common name</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={inputId}
          className="min-w-0 flex-1"
          placeholder="Guinea pig"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter runs the search instead of submitting the enclosing species form
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void search()}>
          {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Search
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Fills in the description and image from the article summary.</p>
    </div>
  );
}
