import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import type { Profile } from "../species/types";

function UserCard({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        {/* The initials repeat the visible name, so they are hidden from screen readers */}
        <Avatar className="h-12 w-12 flex-none" aria-hidden="true">
          <AvatarFallback>{profile.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold leading-none tracking-tight">
            <span className="min-w-0 break-words">{profile.display_name}</span>
            {isSelf && <Badge variant="secondary">You</Badge>}
          </h3>
          <CardDescription className="mt-1 break-all">{profile.email}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {profile.biography ? (
          <p className="whitespace-pre-line text-sm">{profile.biography}</p>
        ) : (
          <TypographyMuted>No biography yet.</TypographyMuted>
        )}
      </CardContent>
    </Card>
  );
}

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  const { data: profiles, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("*")
    .order("display_name");

  return (
    <>
      <div className="mb-5">
        <TypographyH2>Users</TypographyH2>
        <TypographyMuted>Everyone who has joined Biodiversity Hub</TypographyMuted>
      </div>
      <Separator className="my-4" />
      {error ? (
        <p className="text-destructive">Could not load users: {error.message}</p>
      ) : profiles.length === 0 ? (
        <TypographyMuted>No users have joined yet.</TypographyMuted>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <UserCard key={profile.id} profile={profile} isSelf={profile.id === user.id} />
          ))}
        </div>
      )}
    </>
  );
}
