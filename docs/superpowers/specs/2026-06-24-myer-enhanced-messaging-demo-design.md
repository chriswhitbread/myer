# Myer.com Demo with Salesforce Enhanced Messaging — Design

**Date:** 2026-06-24
**Status:** Approved

## Purpose

A self-contained demo site used to walk stakeholders through Salesforce
**Enhanced Messaging** use cases on a realistic retail backdrop. A faithful
rebuild of the current myer.com.au homepage acts as the stage; a
Salesforce-styled Enhanced Messaging chat widget is the star. The presenter
drives scripted, guided conversations covering Returns, Inventory, Order
Status, and Agent Handoff / MYER one.

The Myer page is a backdrop only — no real shopping flow, no real Salesforce
org. The widget is **simulated** (a faithful visual + behavioural clone of
Salesforce Messaging for Web), not wired to a live deployment.

## Success Criteria

- Opens with no build step (`index.html` in a browser, or any static server).
- Homepage reads as the current myer.com.au (Stocktake Sale campaign, navy nav,
  category menu, hero, promo tiles, footer).
- All four conversation flows run end-to-end via quick-reply chips, with
  free-text keyword matching as a fallback.
- Presenter can reset and chain flows without reloading.

## Architecture

Plain **HTML + CSS + vanilla JS**. No build step, no framework, no server
dependency. Three separated concerns:

- **`index.html` + `styles.css`** — Myer homepage backdrop. Semantic sections:
  utility/announcement bar, top nav (logo, category menu, search, icons), hero
  banner, promotional tile grid, category grids, multi-column footer.
- **`messaging.js` + `messaging.css`** — Salesforce Embedded-Messaging-style
  widget: launcher, chat window, message bubbles (customer / bot / agent),
  typing indicator, quick-reply chips, rich cards, handoff treatment, reset.
- **`conversations.js`** — data-driven script engine. Each use case is a tree
  of steps (`bot message → quick-reply options → next step`). The widget
  renders the current step; adding/editing a flow means editing data, not
  logic.

### Step-engine model

A flow is a map of step IDs to step objects. A step can contain:
- one or more bot/agent messages (text and/or rich cards),
- an optional set of quick-reply options, each pointing to a next step ID,
- optional metadata (e.g. switch speaker to agent, show typing delay).

Free-text input is matched by keywords to a flow's entry step; unmatched input
gets a gentle fallback prompting the menu chips.

## Conversation Flows

Welcome menu on open: "Hi, I'm Myer Assist 👋 How can I help today?" with chips
for the four flows. Every flow ends with an "Anything else?" chip returning to
the menu.

1. **Returns** — order card (Order #, thumbnail, item, price) → reason chips
   (Wrong size / Changed mind / Faulty) → return-method chips (Free post label /
   Store drop-off) → refund timeline confirmation + label emailed. Demonstrates
   order lookup, rich cards, automated self-service resolution.

2. **Inventory / stock check** — item + size/colour prompt → stock-results card
   (✅ online; store-by-store: Melbourne ✅, Chadstone ⚠️ low, Bondi ❌) →
   Click & Collect or Notify-when-back chips. Demonstrates real-time inventory,
   store locator, conversational commerce.

3. **Order status / tracking** — order card → tracking timeline (Ordered →
   Packed → Shipped → Out for delivery) with ETA → delivery-help option.
   Demonstrates order-aware answers and status visualisation.

4. **Agent handoff + MYER one** —
   - *MYER one:* "Check my rewards" → account-aware reply with points balance,
     $ credit, and tier.
   - *Handoff:* "Talk to a person" chip → "Connecting you to a specialist…" →
     typing indicator → agent joins (avatar + name, e.g. "Sarah from Myer") →
     bubbles restyle to agent colour. Demonstrates bot→human escalation.

## Widget Visuals (Salesforce Enhanced Messaging style)

- **Launcher:** rounded floating button, bottom-right, navy, chat icon +
  "Myer Assist" label + unread dot.
- **Chat window:** ~380×600px card, rounded, drop shadow. Header with Myer
  logo, "Myer Assist" title, online status dot, minimise/close, and a discreet
  reset control for the presenter.
- **Bubbles:** customer (right, navy); bot (left, light grey + bot avatar);
  agent (left, accent colour + agent avatar/name). Typing indicator = three
  animated dots.
- **Quick-reply chips:** pill buttons under the latest bot message.
- **Rich cards:** order card, stock-results card, tracking timeline — bordered
  cards in the message stream with thumbnails/icons.
- **Handoff:** centered system line ("Sarah joined the conversation") + colour
  shift to agent styling.
- **Colours:** Myer navy primary (~`#001952`), white, light-grey bubbles, warm
  accent for agent. Tuned to match the live-site snapshot.

## Out of Scope

- Real shopping/cart/checkout flow.
- Real Salesforce org / Embedded Service deployment.
- Backend, persistence, or analytics.
- Mobile-first optimisation (desktop demo is the target; should be responsive
  enough not to break, but desktop is primary).

## File Layout

```
index.html
styles.css        # homepage backdrop
messaging.css     # widget styles
messaging.js      # widget rendering + interaction
conversations.js  # flow data + step engine
assets/           # logo, product thumbnails, icons (or inline SVG/CDN)
```
