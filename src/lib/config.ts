// Shared configuration for both client and server
// This file can be imported anywhere

export const LLM_CONFIG = {
  // The model identifier used for chat
  model: "anthropic/claude-sonnet-4.5",
  
  // Human-readable model name for display
  displayName: "Claude Sonnet 4.5",
  
  // Provider name
  provider: "Anthropic (via OpenRouter)",
} as const;
