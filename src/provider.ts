import type { IAgentRuntime, Provider, ProviderResult } from "@elizaos/core";

/**
 * Lets the character model know a QuantumScan safety check is available for
 * every on-chain action it's about to take — this nudges the LLM to actually
 * call CHECK_TRANSACTION_SAFETY / CHECK_CONTRACT_SAFETY instead of signing blind.
 */
export const quantumscanStatusProvider: Provider = {
  name: "QUANTUMSCAN_STATUS",
  description: "Availability of QuantumScan pre-transaction safety checks",
  position: -10,
  get: async (runtime: IAgentRuntime): Promise<ProviderResult> => {
    const hasWallet = Boolean(runtime.getSetting("QUANTUMSCAN_WALLET_PRIVATE_KEY"));
    const hasKey = Boolean(runtime.getSetting("QUANTUMSCAN_API_KEY"));
    const mode = hasWallet ? "autonomous micropayment (x402)" : hasKey ? "prepaid credits" : "free trial";

    return {
      text:
        "QuantumScan is available for pre-transaction security checks (CHECK_TRANSACTION_SAFETY) " +
        `and contract scans (CHECK_CONTRACT_SAFETY), billed via ${mode}. ` +
        "Always check a transaction or contract before signing it if funds are involved.",
      values: { quantumscanPaymentMode: mode },
    };
  },
};
