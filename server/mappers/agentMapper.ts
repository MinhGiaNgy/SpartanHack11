import type { AgentResponseDto } from "@/server/types/agent";

export function extractAgentOutput(result: unknown): string {
  const direct =
    typeof (result as { content?: unknown })?.content === "string"
      ? (result as unknown as { content: string }).content
      : null;
  if (direct) return direct;

  const messages = (result as { messages?: Array<{ content?: unknown; kwargs?: { content?: unknown } }> })
    ?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (typeof last?.content === "string") return last.content;
    if (typeof last?.kwargs?.content === "string") return last.kwargs.content;
  }

  return JSON.stringify(result);
}

export function toDto(output: string): AgentResponseDto {
  return { output };
}
