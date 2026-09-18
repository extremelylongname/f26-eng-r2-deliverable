import { env } from "@/env.mjs";
import Anthropic from "@anthropic-ai/sdk";
import "server-only";

// Initialised once at module load; stays null until ANTHROPIC_API_KEY is configured
const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

const SYSTEM_PROMPT = `You are the species expert for Biodiversity Hub, a community site where people catalogue animals, plants and other living things.

Answer questions about species: habitat, diet, speed, size, lifespan, conservation status, taxonomy, behaviour, comparisons between species and fun facts. Be accurate and concise, format your answers in Markdown, and say plainly when you are unsure or when the science is unsettled.

If the user asks about anything unrelated to species, animals, plants or ecology (for example code, math, news or personal advice), politely explain that you only handle species-related questions and invite them to ask one. Do not answer the off-topic request.`;

export const FALLBACK_MESSAGE = "Sorry, I couldn't come up with an answer just now. Please try again in a moment.";

const CUT_OFF_NOTE = "\n\n*This answer was cut off because it reached the length limit.*";

// Thrown for configuration and provider/upstream failures so the API route can answer 502
export class SpeciesChatError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SpeciesChatError";
  }
}

export async function generateResponse(message: string): Promise<string> {
  if (!client) {
    throw new SpeciesChatError("ANTHROPIC_API_KEY is not configured; set it in .env to enable the species chatbot");
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      // The model's own reasoning shares this budget with the visible answer, so leave ample room for both
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });

    if (response.stop_reason === "refusal") {
      return FALLBACK_MESSAGE;
    }

    // Only text blocks carry the answer; other block types are ignored
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text.trim()] : []))
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

    if (!text) {
      return FALLBACK_MESSAGE;
    }
    // Say so when the answer hit the limit rather than passing off a partial reply as complete
    return response.stop_reason === "max_tokens" ? text + CUT_OFF_NOTE : text;
  } catch (error) {
    if (error instanceof Anthropic.APIError || error instanceof Anthropic.APIConnectionError) {
      throw new SpeciesChatError(`Anthropic request failed: ${error.message}`, { cause: error });
    }
    throw new SpeciesChatError("Unexpected error while generating a chatbot response", { cause: error });
  }
}
