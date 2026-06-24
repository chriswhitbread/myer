# Myer × Salesforce Enhanced Messaging — Demo

A self-contained demo: a faithful rebuild of the myer.com.au homepage with a
Salesforce-styled Enhanced Messaging chat widget. The widget runs four scripted,
guided conversation flows to showcase common retail messaging use cases.

> Demo only. Not affiliated with Myer. The messaging widget is simulated — it is
> not connected to a live Salesforce org.

## Run it

No build step. Either:

- Double-click `index.html`, **or**
- Serve the folder: `python3 -m http.server 8000` then open http://localhost:8000

## Future-state webchat demo

Open the **Need help?** concierge (bottom-left). It opens with:

> "Hi! I can track an order or help with a return. What's your order number?"

Enter an order number to drive a scenario, then verify with the email + mobile on that
order (shown below). The order number deterministically selects the branch:

| Order | Verify with | Scenario |
|---|---|---|
| M1000001 | jane@email.com / 0412 345 789 | WISMO — split delivery (HERO) |
| M1000002 | sam@email.com / 0423 111 222 | WISMO — in transit |
| M1000003 | alex@email.com / 0433 222 333 | WISMO — delivered but disputed (routed) |
| M1000004 | (any) | Ghost order — no record (routed) |
| M1000005 | lee@email.com / 0444 333 444 | WISMO — authority to leave |
| M2000001 | priya@email.com / 0455 444 555 | Returns — faulty (photo → instant label) |
| M2000002 | chris@email.com / 0466 555 666 | Returns — change of mind |
| M2000003 | mia@email.com / 0477 666 777 | Returns — too small → Chadstone click & collect |
| M2000004 | dan@email.com / 0488 777 888 | Returns — damaged, keep it + refund |
| M2000005 | kim@email.com / 0499 888 999 | Returns — marketplace (routed) |

Watch for: the **faux inbox** (top-right) and **phone SMS toast** (bottom-right) firing on
sends; **✅ Resolved / 👤 Routed** badges; the **deflection counter** (bottom-left); a
post-return **cross-sell**; and the **☰ channel-consolidation callout** in the chat header.

> Demo only. Simulated Agentforce-style webchat — not connected to a live Salesforce org or
> any real system. Not affiliated with Myer. All data is mock; PII is masked in replies.
> 3-point verification is fit for order/returns/tracking; account changes would step up to MFA
> (out of scope).

## Files

- `index.html` / `styles.css` — homepage backdrop
- `messaging.css` / `messaging.js` — the chat widget
- `conversations.js` — flow data + step engine (edit this to change scripts)
