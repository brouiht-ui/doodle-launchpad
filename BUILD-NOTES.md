# DOODLE

## Simplified launch flow — September 30, 2026

The user explicitly authorized publishing drawn artwork and coin metadata through Pump.fun's `/api/ipfs` endpoint. This is now the default when no optional Pinata JWT is configured; a missing JWT no longer disables launches. A real disposable canvas fixture uploaded successfully, and its JSON and PNG were publicly fetched through `gateway.pinata.cloud`. The default `ipfs.io` gateway returned 429 from this host, so verification uses the Pinata gateway and new Pump metadata URIs use that gateway. No token was launched by this upload test.

The primary action now connects the wallet if needed, resumes after sign-in, saves the canvas/coin automatically, and prepares the mainnet cost review. Retries reuse the saved coin rather than offering “save another copy.” Final wallet approval is still required. TypeScript, build, API regression tests, and live backend mainnet readiness passed. End-to-end funded wallet launch remains unverified.

## Mainnet integration — September 29, 2026 (supersedes protocol plans below)

The active launch adapter is now Pump `create_v2`, using `@pump-fun/pump-sdk@2.0.0`, on Solana mainnet. Raydium configuration and the old community/stock roadmap below are historical. Only SOL pairs are supported. The launching wallet is the on-chain creator; holder rewards, cashback, and mayhem are disabled. The creator receives the creator-fee allocation, not all protocol trading fees. No opening buy is included.

The backend verifies mainnet genesis, Pump program/global state, public metadata, simulated cost, and simulated curve configuration. The frontend shows a cost review before requesting the creator's signature. Submission requires the exact prepared message and valid signatures. Confirmation checks the receipt and actual curve before marking a coin live. Signed pending launches can be recovered after a reload.

Saved canvas strokes are rendered server-side; the resulting PNG and metadata JSON are uploaded to public IPFS through Pinata. Set `PINATA_JWT` in ignored `.dev.vars` locally. Never put this secret in client code or commit it. `SOLANA_NETWORK=mainnet-beta`, `SOLANA_RPC_URL=https://solana-rpc.publicnode.com`, and `LAUNCH_ENABLED=true` are configured locally, but launch readiness remains false until the hosting credential is present. A dedicated RPC is preferable for production traffic.

Stable local build commands:

    node scripts/run-framework.mjs build
    node scripts/start-local.mjs

Stop the running worker before rebuilding on Windows. The runner copies ignored `.dev.vars` into the ignored build directory and serves http://127.0.0.1:5173. Use Chrome/Brave with Phantom or Solflare for wallet access. The dev streaming preview was unreliable on this host; use the built worker. A local worker restart was also needed after the integration-test run; repeated homepage requests then passed.

Verified: TypeScript, production build, transaction authorization tests, API authentication/ownership/drawing-only regression tests, live mainnet program readiness, and read-only mainnet launch simulation. `node scripts/test-pump-mainnet.mjs` does not broadcast or spend funds. It verifies SOL, original creator, and disabled rewards/cashback/mayhem against simulated curve state.

Still unverified: real Pinata upload (credential absent), real wallet-signed launch, and fee collection after trading. No token was created and no funds were spent. Actual wallet transaction approval belongs to the user. Public deployment has not been performed.

Sources: https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/COIN_CREATION.md and https://raw.githubusercontent.com/pump-fun/pump-fun-skills/main/create-coin/references/METADATA.md.

## Historical build notes

A Solana character launchpad and contributor clubhouse. This is a working full-stack early release, not a production-ready financial protocol.

## Implemented

- Artist-first identity, live drawing canvas on the homepage, responsive discovery page, character detail screens, drawing studio, and job board. No AI example mascots.
- Canvas pencil, eraser, flood fill, undo/redo, brush size, nine colors, PNG export. Image uploads and image pasting are not supported.
- Phantom/Solflare wallet connection and Ed25519 sign-in: five-minute single-use server nonce, origin binding, signature validation, hashed HttpOnly session cookie, logout, and write rate limits. No wallet secrets are requested or held.
- Durable D1 characters, jobs, work submissions, sessions, and transaction intents. The backend accepts validated stroke operations, renders PNGs itself, and stores both original strokes and rendered PNGs in R2. Asset records carry a source marker and SHA-256 of the stroke document; coin creation only accepts creator-owned canvas-v1 assets. Blank/trivial drawing checks reject empty canvases. Server-side ownership and creator-only review.
- SOL reward preparation, wallet signing, exact-message validation, transaction submission, receipt confirmation, idempotent records, active-intent uniqueness, and explorer receipts. The creator pays from their wallet. Rewards are not escrowed.
- A Raydium LaunchLab SOL adapter: configured platform and treasury verification, RPC genesis verification, public metadata check, simulation, ephemeral mint signer, wallet approval, exact transaction matching, and receipt-based mint registration. No automatic opening buy.
- Disabled unsupported USDC/tokenized-stock pair choices with explanations. No fabricated stock addresses, prices, volume, users, or market caps.

## Not live / remaining protocol work

1. Launches are disabled by default. Supply a verified Raydium platform account on the selected cluster, its treasury, a production RPC, and publicly accessible metadata before setting LAUNCH_ENABLED=true. The private Sites preview cannot itself serve public token metadata to wallets/indexers. Publish a suitable public metadata origin or gateway first.
2. The adapter is type-checked against the installed SDK, but has not completed a funded devnet launch or a mainnet launch. A funded devnet integration test is required before enabling mainnet. SDK behavior and platform configuration must be checked against the deployed protocol.
3. The community percentage is a **public pledge**, not an enforced split. Automatic creator-fee capture, attribution, a per-coin treasury, contribution approval governance, and enforceable distribution remain to be implemented and audited. The platform fee wallet check does NOT enforce the creator's pledge; those are distinct revenue streams.
4. Tokenized-stock pairs require supported LaunchLab quote configurations (or a separately integrated pool/curve protocol), verified issuer mints/token extensions, quote-specific economic parameters, funding and liquidity, and applicable issuer eligibility rules. Pairing with a tokenized stock does not make the meme coin stock-backed.
5. Reward signing/broadcast/confirmation code is implemented and transaction validation is unit tested. No real funds were transferred during this build. A funded devnet payment needs end-to-end verification.
6. This version uses creator review and direct creator-funded rewards, not autonomous rankings, community voting, or automatic fee payouts. Public deployment should add moderation/abuse processes, wallet-standard discovery, cancellation/expiry UX for jobs, a supported RPC provider, fee monitoring, and operational recovery.

## Run

Node 22.13+ is required. Install with npm install, then npm run dev. The app serves port 5173. On this Windows host the shared npm shim can fail; direct commands work:

    node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" install
    node scripts/run-framework.mjs dev
    node scripts/run-framework.mjs build
    node node_modules/typescript/bin/tsc --noEmit

Persistence declarations are in .openai/hosting.json. Drizzle schema is in db/schema.ts. Generate schema changes with npm run db:generate, inspect the resulting SQL, then build and apply pending migrations locally using the command documented in README.md. Hosted publishing applies migrations automatically. Never edit applied migrations.

## Tests

    node scripts/test-api.mjs
    node scripts/test-transactions.mjs

API tests intentionally write fixtures only to localhost with ephemeral, unfunded wallets. They verify forged/replayed signatures, CSRF, logout, ownership, durable images/characters/jobs, private reviews, duplicate submissions, unsupported pairs, and the launch gate. They must never run against production.

## Important files

- components/doodle.tsx — product screens and wallet interactions
- components/paint.tsx — drawing tools
- app/api/[...path]/route.ts — API boundaries and persistence
- lib/server.ts — authentication, validation, rate limits, settings
- lib/transactions.ts — Solana transaction lifecycle and Raydium adapter
- lib/transaction-security.ts — pure transaction authorization checks
- db/schema.ts and drizzle/ — database schema and migrations

## Artist-first rule

All coin PFPs must be drawn in the on-site canvas. There is no file upload, image paste, image URL import, or image-generation route. The server's old image-upload endpoint returns HTTP 410; drawing requests accept only bounded stroke documents and render the image server-side. Minimum visible-pencil checks reject blank canvases; they do not judge artistic quality. The homepage says “a launchpad for artists, by an artist” and includes the founder's creative motivation.

Stroke provenance is evidence of the format used, not cryptographic proof that a human drew it. Automated clients could synthesize stroke data. Moderation and additional anti-automation measures are needed before claiming that all artwork is human-made. Existing legacy image assets cannot be used for new coins. The earlier AI-generated mascot asset has been removed from the site.

## Protocol references

- https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/launchpad/createMint.ts
- https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/launchpad/createPlatform.ts
- https://github.com/raydium-io/raydium-idl/blob/master/raydium_launchpad/raydium_launchpad.json
- https://docs.xstocks.fi/docs

## Next engineering milestone

Deploy and test the community fee vault integration on devnet with a configured launch platform; prove fees flow from curve and graduated-pool phases into the correct per-coin ledger, approve a contributor award, and prove an exactly-once payout. Keep mainnet disabled until that lifecycle is demonstrated and reviewed.

## Creator coin pages
- Each character has a shareable `/coin/<id>` URL with a public individual lookup, including characters outside the homepage's latest 100 results.
- Homepage defaults to confirmed launches; drafts remain under the sketchbook/all filters. No placeholder launches are shown.
- The original authenticated creator can customize a separate page headline, story, paper color, and stroke-only drawing wall. Token identity and on-chain metadata are unchanged by page edits.
- `coin_pages` stores the public page content in D1. Migration: `drizzle/0003_blushing_impossible_man.sql`. Apply it in every deployment environment before serving these routes.
- Server checks original coin ownership, strict bounded input, and revision numbers to prevent stale tabs from overwriting newer edits. Drawings accept no uploaded image bytes.
- API integration tests cover anonymous/noncreator denial, persistence, malformed drawing/upload rejection, direct route responses, and stale-write conflicts. Public card navigation and drawing rendering verified at desktop/mobile widths. Owner wallet UI was not exercised with a real funded wallet.

## Current product direction (supersedes rewards/stock plans above)
SOL-only pairing. No stock/USDC choices, community allocation slider, or reward-job navigation. New coin records require communityBps=0 (legacy column retained for compatibility); metadata no longer advertises community pledges. Original drawing-only art and creator-customizable coin pages remain.
Creator fees belong to the launch wallet: the installed Raydium SDK initializes creator as the signed-in owner. Preparation requires a nonzero creatorFeeRate and zero additional platform feeRate, replacing the community-treasury requirement. Launches remain disabled pending deployment configuration and funded end-to-end verification, including post-migration fee behavior. No on-chain fee settings were changed. Legacy job records/endpoints are retained; the jobs UI is retired.
