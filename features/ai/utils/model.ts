import { openai } from "@ai-sdk/openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function getChatModel(modelId?: string | null) {
  return openai(modelId || DEFAULT_OPENAI_MODEL);
}
