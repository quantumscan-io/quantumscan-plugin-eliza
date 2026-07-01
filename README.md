# @quantumscan/plugin-eliza

Pre-transaction safety checks and smart contract security scans for [ElizaOS](https://github.com/elizaOS/eliza) agents, powered by [QuantumScan](https://quantumscan.io).

If your agent holds or moves on-chain funds, this plugin lets it check **before it signs** — not after it's been drained.

## Install

```bash
npm install @quantumscan/plugin-eliza
```

Add it to your character's plugin list:

```ts
import { quantumscanPlugin } from "@quantumscan/plugin-eliza";

export const character = {
  // ...
  plugins: [quantumscanPlugin],
};
```

## What it adds

| Action | Triggers on | Does |
|---|---|---|
| `CHECK_TRANSACTION_SAFETY` | Message contains a contract address the agent is about to interact with | Decodes the target function, checks it against known drainer/scam patterns, returns safe/caution/block |
| `CHECK_CONTRACT_SAFETY` | Message asks about / references a contract address | Full QuantumScan scan: source verification, scam patterns, PQC risk score |

Both are meant to be called by the agent itself, autonomously, before every signed transaction — not just when a human asks "is this safe?".

## Paying for calls

Three modes, checked in this order:

1. **`QUANTUMSCAN_WALLET_PRIVATE_KEY`** (recommended for autonomous agents) — a Base wallet private key. The plugin pays a fraction of a cent in USDC per call via the [x402 protocol](https://x402.org), automatically, with no signup step. Capped at $0.05/call so a bug can't run up a bill.
2. **`QUANTUMSCAN_API_KEY`** — a prepaid-credits key. Get one free (10 credits, no card) at `POST https://quantumscan.io/api/agent/register`.
3. **Neither set** — falls back to QuantumScan's small free daily trial per IP. Fine for development, not for production agents.

Set these in your character's `settings` block or as environment variables (`QUANTUMSCAN_WALLET_PRIVATE_KEY`, `QUANTUMSCAN_API_KEY`, optionally `QUANTUMSCAN_API_URL` if self-hosting).

## Why this matters for autonomous agents specifically

A human clicking "sign" in MetaMask has a second to notice a scam. An autonomous agent doesn't — it signs whatever its logic tells it to sign, at machine speed, potentially with real treasury funds. QuantumScan is built for that gap: a sub-second, machine-callable safety check that costs less than the gas of the transaction it's protecting.

## License

MIT
