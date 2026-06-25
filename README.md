# Myer × Salesforce Enhanced Messaging — Demo

A self-contained demo: a faithful rebuild of the myer.com.au homepage with a
"Myer Concierge" webchat widget. The widget runs a future-state, Agentforce-style
flow — an order-number auth gate plus 10 scripted WISMO and Returns scenarios — to
showcase self-service deflection use cases.

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

### Email-first return (Return an item)

Pick **Return an item** from the opening menu for the headline self-service journey. It is
**email-first** and data-driven from the customer record in `webchat-data.js`:

1. **Enter your email** (any address works in the demo — it falls back to the demo customer).
2. **Confirm it's you with a 6-digit code** — sent to your **email** or your **phone ending 51**.
   Any code you type is accepted in the demo.
3. **Your orders are looked up** — *"You've made 3 orders in the past month"* — each shown as a
   tappable chip (date · lead item · total).
4. **Pick an order**, then choose **the whole order or a single line item** (each order lists 2–3
   products as cards).
5. **Why are you returning it?** — structured reasons (Too small / Too big / Changed my mind / Faulty).
6. **Confirm** → a **prepaid return label** is emailed + texted and the refund is set up.
7. **Size-up exchange offer** — the bot then offers the same item in a different size, naming the
   **nearest store with it in stock** (computed from the record). Pick the *Nike Air Max* and say
   *Too small* to see **Chadstone** (3.1km) offered for click & collect; the dress and top resolve
   to different stores, so the store selection is genuinely data-driven.

Watch for: the **faux inbox** (top-right) and **phone SMS toast** (bottom-right) firing on
sends; **✅ Resolved / 👤 Routed** badges; the **deflection counter** (bottom-left); a
post-return **cross-sell**; and the **☰ channel-consolidation callout** in the chat header.

**Best-practice basis.** The flow follows widely-recommended returns-automation patterns: lift
order details from the OMS up front, support **both order-level and item-level** returns, collect
the reason with **structured options** (size/fit is ~45% of returns), and **proactively offer an
exchange before a refund** to retain the sale (a well-designed exchange path can convert a large
share of would-be refunds). See
[Quickchat — Return & Exchange Chatbot Automation](https://quickchat.ai/post/return-chatbot),
[Loop Returns — chatbots to reduce returns](https://www.loopreturns.com/blog/chatbots-ecommerce-reduce-returns-improve-customer-satisfaction/),
and [The Retail Exec — Ecommerce Returns Best Practices](https://theretailexec.com/logistics/ecommerce-returns-best-practices/).

> Demo only. Simulated Agentforce-style webchat — not connected to a live Salesforce org or
> any real system. Not affiliated with Myer. All data is mock; PII is masked in replies.
> 3-point verification is fit for order/returns/tracking; account changes would step up to MFA
> (out of scope).

## Files

- `index.html` / `styles.css` — homepage backdrop
- `messaging.css` / `messaging.js` — the Myer Concierge widget + demo UI (inbox, SMS toast, badges, counter, cross-sell, callout)
- `webchat-data.js` — mock orders + inventory, PII-masking helpers, lookups
- `webchat-flows.js` — the auth gate + 10 WISMO/Returns scenario flows (edit this to change the demo scripts)
- `conversations.js` — the original concierge welcome step (fallback; superseded by the webchat entry)
