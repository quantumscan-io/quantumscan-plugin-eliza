import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { createQuantumScanClient } from "../client";

const ADDRESS_RE = /0x[0-9a-fA-F]{40}/;

interface ContractScanResponse {
  verified: boolean;
  contractName?: string | null;
  riskScore?: number;
  agentRiskScore?: number;
  agentDecision?: {
    verdict: "safe" | "caution" | "block";
    reason: string;
    avoidFunctions: string[];
  };
}

export const checkContractSafetyAction: Action = {
  name: "CHECK_CONTRACT_SAFETY",
  similes: ["SCAN_CONTRACT", "VERIFY_CONTRACT", "IS_CONTRACT_SAFE", "AUDIT_CONTRACT"],
  description:
    "Runs a full QuantumScan security scan on a smart contract address — verifies the source code, " +
    "checks for known scam/drainer/rug-pull patterns and post-quantum cryptography risk. " +
    "Use this before interacting with an unfamiliar contract for the first time, or when the user " +
    "asks whether a contract/token/protocol is safe.",
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Is this contract safe? 0x1234567890123456789012345678901234567890" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Let me scan that contract with QuantumScan.",
          actions: ["CHECK_CONTRACT_SAFETY"],
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text ?? "";
    return ADDRESS_RE.test(text);
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const text = message.content?.text ?? "";
    const address = text.match(ADDRESS_RE)?.[0];
    const networkMatch = text.match(/\bchain(?:Id)?\s*[:=]?\s*(\d+)/i);
    const network = networkMatch ? Number(networkMatch[1]) : 1;

    if (!address) {
      const errText = "I couldn't find a contract address to scan in that message.";
      if (callback) await callback({ text: errText });
      return { success: false, text: errText };
    }

    try {
      const client = await createQuantumScanClient(runtime);
      const result = await client.fetchJson<ContractScanResponse>(
        `/api/scan/contract?address=${address}&network=${network}`,
      );

      const decision = result.agentDecision;
      const responseText = decision
        ? decision.verdict === "safe"
          ? `✅ ${address} (${result.contractName ?? "unverified name"}) — risk score ${result.riskScore ?? "n/a"}/100. ${decision.reason}`
          : `⚠️ ${address} — verdict "${decision.verdict}". ${decision.reason}` +
            (decision.avoidFunctions.length
              ? ` Avoid calling: ${decision.avoidFunctions.join(", ")}.`
              : "")
        : `Could not determine a clear verdict for ${address}. Treat as unverified — proceed with caution.`;

      if (callback) await callback({ text: responseText });
      return {
        success: true,
        text: responseText,
        data: { address, network, riskScore: result.riskScore, verdict: decision?.verdict },
      };
    } catch (err) {
      const errText = `QuantumScan contract scan failed: ${(err as Error).message}.`;
      if (callback) await callback({ text: errText });
      return { success: false, text: errText, error: err as Error };
    }
  },
};
