import type { Database } from "@/lib/schema";

export type Species = Database["public"]["Tables"]["species"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SpeciesComment = Database["public"]["Tables"]["comments"]["Row"];

// A species row joined with its author's public profile (via the species.author -> profiles.id foreign key)
export type AuthorProfile = Pick<Profile, "display_name" | "email" | "biography">;
export type SpeciesWithAuthor = Species & { profiles: AuthorProfile | null };

// A comment row joined with its author's display name
export type CommentWithAuthor = SpeciesComment & { profiles: Pick<Profile, "display_name"> | null };
