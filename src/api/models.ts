export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5 (Fast)",
    contextWindow: 200_000,
    maxOutput: 64_000,
    inputCostPer1M: 1.0,
    outputCostPer1M: 5.0,
  },
  {
    id: "claude-sonnet-4-6-20260618",
    name: "Claude Sonnet 4.6 (Balanced)",
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
  {
    id: "claude-opus-4-8-20260618",
    name: "Claude Opus 4.8 (Powerful)",
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    inputCostPer1M: 5.0,
    outputCostPer1M: 25.0,
  },
];

export function getModelInfo(modelId: string): ModelInfo {
  return (
    CLAUDE_MODELS.find((m) => m.id === modelId) ??
    CLAUDE_MODELS[0]
  );
}
