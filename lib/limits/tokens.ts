// Centralized limits for tokens and derived character counts

// Maximum input tokens allowed for a single user message
export const MAX_INPUT_TOKENS = 50_000;

// Derive maximum message characters as 3x tokens (rough heuristic)
export const MAX_MESSAGE_CHARS = MAX_INPUT_TOKENS * 3;
