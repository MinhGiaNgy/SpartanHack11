import { agentService } from "@/server/services/agentService";
import { extractAgentOutput, toAgentResponseDto } from "@/server/mappers/agentMapper";

export async function handlePostAgent(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body?.input === "string" ? body.input : "";

    if (!input) {
      return Response.json(
        { error: "Missing 'input' in request body." },
        { status: 400 }
      );
    }

    // Call service layer
    const result = await agentService.invokeAgent(input);

    // Map to output
    const output = extractAgentOutput(result);
    const dto = toAgentResponseDto(output);

    console.log("Controller");

    // Return JSON response
    return Response.json(dto);
  } catch (error) {
    console.error("Error invoking agent:", error);
    return Response.json(
      { error: "Failed to invoke agent" },
      { status: 500 }
    );
  }
}
