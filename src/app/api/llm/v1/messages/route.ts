import { proxy } from "@/lib/server/llm";

export const maxDuration = 300;

/** Anthropic compatible messages endpoint (streaming supported). */
export async function POST(req: Request) {
  return proxy(req, "anthropic");
}
