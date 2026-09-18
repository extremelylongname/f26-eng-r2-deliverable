// Add util functions that should only be run in server components. Importing these in client components will throw an error.
// For more info on how to avoid poisoning your server/client components: https://www.youtube.com/watch?v=BZlwtR9pDp4
import { env } from "@/env.mjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import "server-only";
import { type Database } from "./schema";

export const createServerSupabaseClient = cache(() => {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  return supabase;
});

// The signed-in user, verified with the auth server (getSession only trusts the cookie). Cached per request so the
// navbar, the auth status and the page share a single round trip.
export const getCurrentUser = cache(async () => {
  const {
    data: { user },
  } = await createServerSupabaseClient().auth.getUser();
  return user;
});
