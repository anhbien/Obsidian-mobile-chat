import { requestUrl } from "obsidian";

const MODELS_URL = "https://api.anthropic.com/v1/models";
const API_VERSION = "2023-06-01";

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
}

/**
 * Static fallback list, used when the Models API is unavailable (offline, or
 * no API key yet). IDs are bare aliases — never date-suffixed — so the API
 * resolves them to the current snapshot instead of returning a 404.
 */
export const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8 (Powerful)",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    inputCostPer1M: 5.0,
    outputCostPer1M: 25.0,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (Balanced)",
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5 (Fast)",
    contextWindow: 200_000,
    maxOutput: 64_000,
    inputCostPer1M: 1.0,
    outputCostPer1M: 5.0,
  },
];

/**
 * Derive sizing/pricing metadata for a model id. The list endpoint only
 * returns id + display_name, so we look up known models and fall back to
 * per-family heuristics for anything new.
 */
function metadataFor(id: string): Omit<ModelInfo, "id" | "name"> {
  const known = FALLBACK_MODELS.find((m) => id === m.id || id.startsWith(m.id));
  if (known) {
    return {
      contextWindow: known.contextWindow,
      maxOutput: known.maxOutput,
      inputCostPer1M: known.inputCostPer1M,
      outputCostPer1M: known.outputCostPer1M,
    };
  }
  if (id.includes("opus")) return { contextWindow: 1_000_000, maxOutput: 32_000 };
  if (id.includes("sonnet")) return { contextWindow: 1_000_000, maxOutput: 64_000 };
  if (id.includes("haiku")) return { contextWindow: 200_000, maxOutput: 64_000 };
  return { contextWindow: 200_000, maxOutput: 8_192 };
}

// In-memory cache of the most recently fetched (or fallback) model list.
let cachedModels: ModelInfo[] = FALLBACK_MODELS;

export function getCachedModels(): ModelInfo[] {
  return cachedModels;
}

export function setCachedModels(models: ModelInfo[]): void {
  if (models.length > 0) cachedModels = models;
}

/**
 * Fetch the available models from the Anthropic Models API.
 * Uses Obsidian's requestUrl so it works on mobile and avoids CORS issues.
 */
export async function fetchModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await requestUrl({
    url: `${MODELS_URL}?limit=100`,
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    throw: false,
  });

  if (response.status !== 200) {
    const msg = response.json?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Failed to load models: ${msg}`);
  }

  const data: Array<{ id: string; display_name?: string }> =
    response.json?.data ?? [];

  return data.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.id,
    ...metadataFor(m.id),
  }));
}

/**
 * Look up metadata for a model id. Consults the cached list first, then
 * synthesizes sensible defaults so an unknown id still gets a usable
 * context window rather than silently borrowing another model's.
 */
export function getModelInfo(modelId: string): ModelInfo {
  const found = cachedModels.find((m) => m.id === modelId);
  if (found) return found;
  return { id: modelId, name: modelId, ...metadataFor(modelId) };
}
