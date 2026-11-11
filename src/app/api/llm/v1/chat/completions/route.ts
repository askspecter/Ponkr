import { proxy } from "@/lib/server/llm";

export const maxDuration = 300;

/** OpenAI compatible chat completions (streaming supported). */
export async function POST(req: Request) {
  return proxy(req, "openai");
}
