import { handlePostAgent } from "@/server/controllers/agentController";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body?.input === "string" ? body.input : "";

    if (!input) {
      return Response.json(
        { error: "Missing 'input' in request body." },
        { status: 400 }
      );
    }

    // Call controller
    const result = await handlePostAgent(input);

    // Return JSON response
    return Response.json(result);
  } catch (error) {
    console.error("Error in agent route:", error);
    return Response.json(
      { error: "Failed to invoke agent" },
      { status: 500 }
    );
  }
}

