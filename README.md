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

## Demo script

Click the **💬 Myer Assist** launcher (bottom-right), then:

1. **Returns** — "Return an item" → pick a reason → "Free post label". Shows order
   lookup, rich order card, and automated refund resolution.
2. **Inventory** — "Check stock" → pick an item → see live store-by-store
   availability → "Click & Collect". Shows real-time inventory + conversational commerce.
3. **Order status** — "Track my order" → see the tracking timeline + ETA. Shows
   order-aware answers and status visualisation.
4. **MYER one & handoff** — "Check my MYER one rewards" for an account-aware
   balance; "Talk to a person" to see the bot→agent handoff (Sarah joins, bubbles
   restyle).

Free typing also works (e.g. "where is my order"). Use the header **↻** button to
reset between runs.

## Files

- `index.html` / `styles.css` — homepage backdrop
- `messaging.css` / `messaging.js` — the chat widget
- `conversations.js` — flow data + step engine (edit this to change scripts)
