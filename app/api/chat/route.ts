import { getCurrentUser } from "@/lib/server-utils";
import { generateResponse, SpeciesChatError } from "@/lib/services/species-chat";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function POST(request: Request) {
  // Every page of the app needs a login and each answer spends API credits, so anonymous calls are refused
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Please log in to use the species chatbot." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please keep your question between 1 and 2000 characters." }, { status: 400 });
  }

  try {
    return NextResponse.json({ response: await generateResponse(parsed.data.message) });
  } catch (error) {
    if (error instanceof SpeciesChatError) {
      // The reason (missing key, provider outage) belongs in the server log; the user gets a generic message
      console.error(error);
      return NextResponse.json(
        { error: "The species chatbot is temporarily unavailable. Please try again later." },
        { status: 502 },
      );
    }
    throw error;
  }
}
