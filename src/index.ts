import type { Plugin } from "@elizaos/core";
import { checkTransactionSafetyAction } from "./actions/checkTransactionSafety";
import { checkContractSafetyAction } from "./actions/checkContractSafety";
import { quantumscanStatusProvider } from "./provider";

/**
 * QuantumScan plugin for ElizaOS.
 *
 * Gives an agent the ability to check whether a transaction or contract is
 * safe before signing — real-time, agent-to-agent, billed in fractions of a
 * cent via the x402 protocol (or free credits if no wallet is configured).
 *
 * Settings (character.settings or .env):
 *   QUANTUMSCAN_WALLET_PRIVATE_KEY  optional — Base wallet private key for
 *                                    autonomous x402 micropayments (recommended)
 *   QUANTUMSCAN_API_KEY             optional — prepaid credits key, get one free
 *                                    at https://quantumscan.io/api/agent/register
 *   QUANTUMSCAN_API_URL             optional — defaults to https://quantumscan.io
 */
export const quantumscanPlugin: Plugin = {
  name: "quantumscan",
  description:
    "Pre-transaction safety checks and smart contract security scans via QuantumScan, " +
    "for agents that hold or move on-chain funds.",
  actions: [checkTransactionSafetyAction, checkContractSafetyAction],
  providers: [quantumscanStatusProvider],
};

export default quantumscanPlugin;
export { checkTransactionSafetyAction, checkContractSafetyAction, quantumscanStatusProvider };
