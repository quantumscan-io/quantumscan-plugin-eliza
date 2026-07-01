// HTTP client for QuantumScan's agent-facing endpoints.
//
// Three ways to pay, tried in this order, so the plugin works whether the
// character has a funded wallet or not:
//
//   1. QUANTUMSCAN_WALLET_PRIVATE_KEY setting → real x402 micropayment
//      (wraps fetch with wrapFetchWithPayment; agent pays a fraction of a
//      cent in USDC on Base per call, fully autonomous, no signup)
//   2. QUANTUMSCAN_API_KEY setting → prepaid credits (get one free at
//      https://quantumscan.io/api/agent/register)
//   3. Neither set → plain fetch, relies on QuantumScan's small free daily
//      trial per IP (fine for testing, not for production agents)

import type { IAgentRuntime } from "@elizaos/core";
import { wrapFetchWithPayment } from "x402-fetch";
import { createSigner } from "x402/types";

const DEFAULT_BASE_URL = "https://quantumscan.io";

export interface QuantumScanClient {
  fetchJson<T>(path: string, init?: RequestInit): Promise<T>;
  paymentMode: "x402" | "api-key" | "free-trial";
}

export async function createQuantumScanClient(
  runtime: IAgentRuntime,
): Promise<QuantumScanClient> {
  const baseUrl = String(runtime.getSetting("QUANTUMSCAN_API_URL") || DEFAULT_BASE_URL);
  const privateKeySetting = runtime.getSetting("QUANTUMSCAN_WALLET_PRIVATE_KEY");
  const apiKeySetting = runtime.getSetting("QUANTUMSCAN_API_KEY");
  const privateKey = privateKeySetting ? String(privateKeySetting) : undefined;
  const apiKey = apiKeySetting ? String(apiKeySetting) : undefined;

  let doFetch: typeof fetch = fetch;
  let paymentMode: QuantumScanClient["paymentMode"] = "free-trial";

  if (privateKey) {
    // Real EIP-3009 signer — this is the agent's own on-chain wallet.
    // wrapFetchWithPayment intercepts any 402 response, signs a payment
    // authorization for the exact amount requested, and retries once.
    const signer = createSigner("base", privateKey as `0x${string}`);
    doFetch = wrapFetchWithPayment(fetch, await signer, BigInt(50_000)) as typeof fetch; // cap: $0.05 max auto-pay per call
    paymentMode = "x402";
  } else if (apiKey) {
    paymentMode = "api-key";
  }

  async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (apiKey && !privateKey) headers.set("X-API-Key", apiKey);
    headers.set("Content-Type", "application/json");

    const res = await doFetch(`${baseUrl}${path}`, { ...init, headers });

    if (res.status === 402) {
      throw new Error(
        "QuantumScan requires payment for this call. Configure QUANTUMSCAN_WALLET_PRIVATE_KEY " +
          "(autonomous micropayment) or QUANTUMSCAN_API_KEY (free at " +
          `${baseUrl}/api/agent/register) in this character's settings.`,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`QuantumScan API error ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  return { fetchJson, paymentMode };
}
