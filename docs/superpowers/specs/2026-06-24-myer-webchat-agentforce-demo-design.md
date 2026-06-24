# Myer Future-State Webchat (Agentforce-style) — Design

**Date:** 2026-06-24
**Status:** Approved

## Purpose

Extend the existing Myer Concierge widget (on the brand-faithful homepage) into a
clickable prototype of the **future-state Myer webchat** — an Agentforce-style
assistant covering **WISMO** (Where Is My Order) and **Returns**. For a stakeholder
demo, not production. All data mocked; no real backend.

The chat is **unauthenticated** (public webchat). A **lightweight 3-point
verification** off the order replaces login. No password/MFA (account changes would
need step-up auth — explicitly out of scope).

This REPLACES the current 5-chip welcome. Same widget design (real Myer Concierge:
black header, round black bottom-left launcher, outlined pills, Poppins, intro card).
Same no-build vanilla JS / data-driven step engine — no React, no build step.

## Approach

- Keep the existing vanilla widget (`messaging.js`/`messaging.css`) and step engine.
  Add: mock data files, an auth gate, the 10 branching scenarios, and demo-UI panels
  (faux inbox, phone toast, badges, deflection counter, channel callout).
- **Deterministic:** the order number entered selects the scenario (map below), so the
  presenter can drive any branch on demand. Mock order + inventory records in JSON.
- "Send label/confirmation" fires a **mock email AND mock SMS** that visibly appear:
  a faux inbox panel + a faux phone toast.
- **Mask PII** in bot replies: `j****@email.com`, `04** *** 789`.
- Warm, concise tone. Aussie spelling.

## Auth gate (before any flow)

1. Bot: "Hi! I can track an order or help with a return. What's your order number?"
2. Customer enters order number → looks up mock record (selects scenario).
3. Bot asks for email + mobile on the order (optional postcode as stronger 3rd point).
4. Match 2–3 points against the record. Pass → "Perfect, that checks out. ✅" and proceed
   to the order's scenario.
5. Fail twice → "I couldn't match those details — let me connect you to the team" (route
   to human).
6. Audience tooltip: "3-point verification — fit for order, returns and tracking. Account
   changes would step up to MFA."
- Ghost order (no record, M1000004) → route to human (scenario A4).

## Flow A — WISMO (branch on mock order record)

- **A1 Split delivery (HERO)** — order in two parts; jacket out for delivery today (Aus
  Post), homewares Thursday; offer tracking links; send via email + SMS.
- **A2 In transit** — Couriers Please, in transit, ETA tomorrow, live tracking link.
- **A3 Delivered but disputed** — route to human (carrier investigation + proof of
  delivery); do NOT fake resolution.
- **A4 Ghost order** — no record → hand to teammate.
- **A5 Authority-to-leave / post office** — delivered to local post office; collection slip.

## Flow B — Returns (branch on reason)

Offer label as **email or text**, **print-at-home or drop-off (QR)**.

- **B1 Faulty** — request photo of fault (faux upload) → instant prepaid label, no postage;
  deliver label by chosen channel; refund on scan.
- **B2 Change of mind** — within 30 days, customer pays postage; label by email/text.
- **B3 Too small → replacement → Chadstone C&C (SAVE-THE-SALE)** — offer same dress larger
  size; mock inventory lookup (product+size+store) returns "in stock at Chadstone"; options
  Click&Collect / post / refund; on C&C, reserve size 12 + send collection details AND
  prepaid return label for size 10 via email + SMS; bring size 10 at collection, swap on
  the spot, no postage. Fallback if size not in stock anywhere → order in / refund.
- **B4 Customer-can-keep (damaged)** — no return needed, keep it, refund now, 3–5 days.
- **B5 Marketplace/DSV/bulky** — return runs through marketplace partner; raise it, specialist
  emails next steps within one business day.

## Order-number → scenario map (deterministic)

| Order | Scenario |
|---|---|
| M1000001 | A1 Split delivery |
| M1000002 | A2 In transit |
| M1000003 | A3 Delivered but disputed |
| M1000004 | A4 Ghost order (no record) |
| M1000005 | A5 Authority to leave |
| M2000001 | B1 Faulty |
| M2000002 | B2 Change of mind |
| M2000003 | B3 Too small → Chadstone C&C |
| M2000004 | B4 Customer-can-keep (damaged) |
| M2000005 | B5 Marketplace/DSV |

Mock order record fields: orderNumber, email, mobile, postcode, scenario, plus
scenario-specific data (items, carrier, ETA, tracking, product/size for B3).

## Demo-theatre extras

1. **Proactive split-delivery** — for A1, the bot may OPEN with "I can see your order's
   coming in 2 parts…" before the customer asks.
2. **Cross-sell** — after a successful return/exchange, a light "these go well with it"
   suggestion (1–2 product tiles reusing Myer CDN images).
3. **Resolved vs routed badge** — small UI tag per outcome: ✅ Resolved instantly / 👤 Routed
   to specialist.
4. **Deflection counter** — corner widget tallying "X of Y enquiries resolved without an
   agent" across the session.
5. **Channel-consolidation callout** — one screen/panel: all this in a single chat vs the
   current Genesys/Oration + Freshdesk + BSP + ShipIT spread.

## Mock email + SMS rendering

- **Faux inbox panel** — slides in / sits beside the widget; new "emails" append with
  from/subject/preview (masked PII), timestamped.
- **Faux phone toast** — a small phone-styled SMS notification animates in when a text
  "sends".
- Both fire together on label/confirmation/collection-detail sends.

## Files

- `webchat-data.js` — mock orders + inventory (JSON-like), order→scenario map, PII-mask
  helpers.
- `webchat-flows.js` — the auth gate + 10 scenario step trees (data for the engine).
- Extend `messaging.js` — order-number capture, verification logic, fire email/SMS,
  badges, deflection counter, cross-sell; reuse existing rendering + esc() XSS protection.
- Extend `messaging.css` — inbox panel, phone toast, badges, counter, callout, photo-upload
  control.
- `conversations.js` welcome step → replaced by the auth-gate entry.

## Out of scope (state if asked)

Real authentication, payments, live carrier APIs, account/profile updates (need step-up
MFA), real inventory/OMS writes. All mocked.

## Keep / constraints

- No build step; vanilla only; deploys to GitHub Pages as-is.
- Preserve esc() escaping + safeColor() (public site).
- Same Myer Concierge visual design + the brand-faithful homepage backdrop.
- Footer/README disclaimer: demo, not affiliated with Myer, simulated.
