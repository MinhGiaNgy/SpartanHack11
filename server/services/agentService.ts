import { buildAgent } from "@/lib/agent";

export interface AgentInvokeInput {
  input: string;
}

export class AgentService {
  async invokeAgent(input: string): Promise<unknown> {
    const agent = await buildAgent();
    const result = await agent.invoke({
      messages: [{ role: "user", content: input }],
    });

    console.log("service");
    return result;
  }
}

export const agentService = new AgentService();
