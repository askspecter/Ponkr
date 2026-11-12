import { listModels } from "@/lib/server/llm";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public model catalog with Kekr prices (USD per 1M tokens). */
export async function GET() {
  return handle(async () => {
    const models = await listModels();
    return json({
      object: "list",
      data: models.map((m) => ({
        id: m.id,
        object: "model",
        name: m.name,
        owned_by: m.provider,
        description: m.description ?? null,
        created: m.created ?? null,
        endpoints: m.formats.map((f) => (f === "openai" ? "/api/llm/v1/chat/completions" : "/api/llm/v1/messages")),
        context_length: m.context ?? null,
        max_output_tokens: m.maxOutput ?? null,
        input_modalities: m.modalities,
        pricing: { input: m.input, output: m.output, cache_read: m.cacheRead ?? null, cache_write: m.cacheWrite ?? null, unit: "million_tokens", currency: "usd" },
      })),
    });
  });
}
