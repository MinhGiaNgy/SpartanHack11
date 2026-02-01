import { runAgent } from "../../../lib/agent";

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

  const output = await runAgent(input);
  return Response.json({ output });
}
