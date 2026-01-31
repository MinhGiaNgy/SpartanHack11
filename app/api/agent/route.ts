import { buildAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";

  if (!input) {
    return Response.json(
      { error: "Missing 'input' in request body." },
      { status: 400 }
    );
  }

  const agent = await buildAgent();
  const result = await agent.invoke({
    messages: [{ role: "user", content: input }],
  });

  const output = (() => {
    const direct =
      typeof (result as { content?: unknown })?.content === "string"
        ? (result as { content: string }).content
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
  })();

  return Response.json({ output });
}
