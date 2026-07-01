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
const CALLDATA_RE = /0x[0-9a-fA-F]{8,}/;

interface TransactionCheckResponse {
  verified: boolean;
  verdict?: string;
  functionName?: string;
  reason?: string;
  recommendation?: string;
}

export const checkTransactionSafetyAction: Action = {
  name: "CHECK_TRANSACTION_SAFETY",
  similes: [
    "VERIFY_TRANSACTION",
    "IS_TRANSACTION_SAFE",
    "SCAN_TRANSACTION",
    "PRE_TX_CHECK",
  ],
  description:
    "Checks whether a specific on-chain transaction (contract address + calldata) is safe to sign, " +
    "before this agent executes it. Call this before EVERY transaction the agent is about to sign, " +
    "not just when the user explicitly asks — signing an unsafe transaction can drain the agent's wallet.",
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Swap 500 USDC for ETH on 0xabc123... using this calldata: 0xdef456..." },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Checking this transaction with QuantumScan before I sign it...",
          actions: ["CHECK_TRANSACTION_SAFETY"],
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
    const calldata = text.match(CALLDATA_RE)?.[0] ?? "0x";
    const networkMatch = text.match(/\bchain(?:Id)?\s*[:=]?\s*(\d+)/i);
    const network = networkMatch ? Number(networkMatch[1]) : 1;

    if (!address) {
      const errText = "I couldn't find a contract address to check in that message.";
      if (callback) await callback({ text: errText });
      return { success: false, text: errText };
    }

    try {
      const client = await createQuantumScanClient(runtime);
      const result = await client.fetchJson<TransactionCheckResponse>("/api/scan/transaction", {
        method: "POST",
        body: JSON.stringify({ address, calldata, network }),
      });

      const verdict = result.verdict ?? "unknown";
      const isSafe = verdict === "safe";
      const responseText = isSafe
        ? `✅ QuantumScan checked this transaction on ${address} and found no known risk. ${result.recommendation ?? ""}`
        : `⚠️ QuantumScan flagged this transaction: ${result.reason ?? verdict}. ${result.recommendation ?? "I will not sign this."}`;

      if (callback) await callback({ text: responseText });
      return {
        success: true,
        text: responseText,
        data: { verdict, address, network, safe: isSafe },
      };
    } catch (err) {
      const errText = `QuantumScan safety check failed: ${(err as Error).message}. Treating as unsafe — refusing to sign until this is resolved.`;
      if (callback) await callback({ text: errText });
      return { success: false, text: errText, error: err as Error };
    }
  },
};
