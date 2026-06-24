# Myer Future-State Webchat (Agentforce-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Myer Concierge widget into a clickable prototype of the future-state Agentforce-style webchat — an order-number-driven auth gate plus 10 branching WISMO/Returns scenarios, with mock email/SMS, PII masking, and demo-theatre extras (badges, deflection counter, cross-sell, channel callout).

**Architecture:** Keep the existing no-build vanilla-JS widget and its data-driven step engine. Add mock data + scenario flow-trees in new JS files, extend the engine to support order capture / verification / dynamic scenario routing / side-effects (fire email+SMS, increment counter, show badge), and add new CSS-styled demo-UI panels (faux inbox, phone toast, badges, counter, channel callout). The current 5-chip welcome is replaced by the auth-gate entry.

**Tech Stack:** Plain HTML5, CSS3, vanilla ES6. No framework, no build step, no npm. Node only used to run headless assertion checks during verification. Remote Myer CDN images reused for cross-sell tiles.

## Global Constraints

- No build step: must run by opening index.html or via any static server; deploys to GitHub Pages as-is.
- No framework, no bundler, no npm dependencies. Vanilla ES6 only.
- Preserve `esc()` HTML-escaping on ALL dynamic text reaching innerHTML, and `safeColor()` for any color reaching a style attribute. Do not regress XSS protection (public site).
- Keep the real Myer Concierge visual design: black header titled "Myer Concierge", round black launcher (icon-only circle + grey "Need help?" pill) at bottom-LEFT, chat window bottom-LEFT, outlined white pill chips, Poppins font, the intro-card treatment for the first step.
- Aussie spelling; warm, concise tone. Exact scripted copy from the spec where given.
- Mask PII in bot replies: email as `j****@email.com`, mobile as `04** *** 789`.
- Deterministic: the order number entered selects the scenario per the map. Mock orders + inventory live in data files.
- Mock email AND mock SMS must both visibly render on screen (faux inbox panel + phone toast) when a label/confirmation/collection-detail "sends".
- Out of scope (mock only, state if asked): real auth, payments, live carrier APIs, account/profile updates (need step-up MFA), real inventory/OMS writes.
- The agent-handoff persona stays "Sarah". Bot is "Myer Concierge".

## File Structure

- `webchat-data.js` (new) — `window.MyerWebchat.orders` (mock order records keyed by order number), `window.MyerWebchat.inventory` (product+size+store stock), `maskEmail()`, `maskMobile()`, `lookupOrder()`, `checkInventory()`.
- `webchat-flows.js` (new) — `window.MyerWebchatFlows`: the auth-gate steps + all 10 scenario step-trees as engine data, consuming the data helpers.
- `messaging.js` (modify) — load order capture + verification + scenario routing + side-effects (email/SMS/badge/counter/cross-sell) into the existing engine; replace the welcome entry with the auth gate.
- `messaging.css` (modify) — inbox panel, phone toast, resolved/routed badge, deflection counter, channel-consolidation callout, photo-upload control, masked-PII styling.
- `conversations.js` (modify) — repoint `welcomeStepId` to the new auth-gate entry (or have messaging.js start the webchat flow). Keep existing flow data only if still referenced; otherwise the webchat flows supersede it.
- `index.html` (modify) — add `<script src="webchat-data.js">` and `<script src="webchat-flows.js">` BEFORE `messaging.js` and after `conversations.js`; add mount points for inbox panel / phone toast / deflection counter if not injected by JS.
- `README.md` (modify) — document the new webchat demo + the order→scenario map + demo script.

---

### Task 1: Mock data layer (orders, inventory, PII masking, lookups)

**Files:**
- Create: `webchat-data.js`
- Modify: `index.html` (add `<script src="webchat-data.js"></script>` immediately after the `conversations.js` script tag)

**Interfaces:**
- Consumes: nothing.
- Produces: global `window.MyerWebchat` with:
  - `orders` — object keyed by orderNumber. Each record: `{ orderNumber, email, mobile, postcode, scenario, customerName, data }` where `scenario` is one of `"A1".."A5","B1".."B5"` and `data` holds scenario-specific fields.
  - `inventory` — array of `{ product, size, store, inStock }`.
  - `maskEmail(email)` → string like `j****@email.com`.
  - `maskMobile(mobile)` → string like `04** *** 789`.
  - `lookupOrder(orderNumber)` → the record or `null`.
  - `checkInventory(product, size, store)` → `true|false`.

- [ ] **Step 1: Write `webchat-data.js`**

```js
/* Mock data for the Myer future-state webchat demo (no backend) */
window.MyerWebchat = (function () {
  const orders = {
    M1000001: { orderNumber: "M1000001", email: "jane@email.com", mobile: "0412 345 789", postcode: "3000", scenario: "A1", customerName: "Jane",
      data: { parts: [
        { item: "Country Road Wool Jacket", carrier: "Australia Post", status: "Out for delivery today", track: "#" },
        { item: "2 × Sheridan Homewares", carrier: "Australia Post", status: "Tracking for Thursday", track: "#" }
      ] } },
    M1000002: { orderNumber: "M1000002", email: "sam@email.com", mobile: "0423 111 222", postcode: "2000", scenario: "A2", customerName: "Sam",
      data: { carrier: "Couriers Please", status: "In transit", eta: "tomorrow", track: "#" } },
    M1000003: { orderNumber: "M1000003", email: "alex@email.com", mobile: "0433 222 333", postcode: "4000", scenario: "A3", customerName: "Alex",
      data: { status: "Delivered (disputed)" } },
    // M1000004 intentionally absent → ghost order (A4)
    M1000005: { orderNumber: "M1000005", email: "lee@email.com", mobile: "0444 333 444", postcode: "5000", scenario: "A5", customerName: "Lee",
      data: { location: "Your local post office", slip: "#" } },
    M2000001: { orderNumber: "M2000001", email: "priya@email.com", mobile: "0455 444 555", postcode: "3121", scenario: "B1", customerName: "Priya",
      data: { item: "Trenery Linen Top" } },
    M2000002: { orderNumber: "M2000002", email: "chris@email.com", mobile: "0466 555 666", postcode: "3141", scenario: "B2", customerName: "Chris",
      data: { item: "Nike Air Max Shoes" } },
    M2000003: { orderNumber: "M2000003", email: "mia@email.com", mobile: "0477 666 777", postcode: "3148", scenario: "B3", customerName: "Mia",
      data: { product: "Seed Linen Dress", currentSize: "10", wantSize: "12", store: "Myer Chadstone" } },
    M2000004: { orderNumber: "M2000004", email: "dan@email.com", mobile: "0488 777 888", postcode: "6000", scenario: "B4", customerName: "Dan",
      data: { item: "Royal Doulton Dinner Set" } },
    M2000005: { orderNumber: "M2000005", email: "kim@email.com", mobile: "0499 888 999", postcode: "7000", scenario: "B5", customerName: "Kim",
      data: { item: "Marketplace BBQ" } }
  };

  const inventory = [
    { product: "Seed Linen Dress", size: "12", store: "Myer Chadstone", inStock: true },
    { product: "Seed Linen Dress", size: "14", store: "Myer Chadstone", inStock: false }
  ];

  function maskEmail(email) {
    const [user, domain] = String(email).split("@");
    if (!domain) return email;
    return user.slice(0, 1) + "****@" + domain;
  }
  function maskMobile(mobile) {
    const digits = String(mobile).replace(/\s+/g, "");
    return "04** *** " + digits.slice(-3);
  }
  function lookupOrder(orderNumber) {
    return orders[String(orderNumber).trim().toUpperCase()] || null;
  }
  function checkInventory(product, size, store) {
    return inventory.some((i) => i.product === product && i.size === size && i.store === store && i.inStock);
  }

  return { orders, inventory, maskEmail, maskMobile, lookupOrder, checkInventory };
})();
```

- [ ] **Step 2: Add the script tag in `index.html`** (immediately after `<script src="conversations.js"></script>`)

```html
  <script src="conversations.js"></script>
  <script src="webchat-data.js"></script>
```

- [ ] **Step 3: Verify the data layer with Node**

Run:
```bash
node -e "global.window={}; require('./webchat-data.js'); const W=window.MyerWebchat;
console.log('mask email:', W.maskEmail('jane@email.com'));
console.log('mask mobile:', W.maskMobile('0412 345 789'));
console.log('lookup M2000003 scenario:', W.lookupOrder('M2000003').scenario);
console.log('ghost M1000004:', W.lookupOrder('M1000004'));
console.log('inv size12 Chadstone:', W.checkInventory('Seed Linen Dress','12','Myer Chadstone'));
console.log('inv size14 Chadstone:', W.checkInventory('Seed Linen Dress','14','Myer Chadstone'));"
```
Expected: `j****@email.com`; `04** *** 789`; `B3`; `null`; `true`; `false`.

- [ ] **Step 4: Commit**

```bash
git add webchat-data.js index.html
git commit -m "feat: mock data layer for webchat demo (orders, inventory, PII masking)"
```

---

### Task 2: Engine extensions — input capture, verification, side-effects

**Files:**
- Modify: `messaging.js`

**Interfaces:**
- Consumes: existing engine functions (`appendBubble`, `showTyping`/`hideTyping`, `renderQuickReplies`, `clearQuickReplies`, `goToStep`, `messagesEl`, `esc`, `scrollDown`), and `window.MyerWebchat` from Task 1.
- Produces (added to the widget closure, exposed where noted):
  - `state` object: `{ order: null, attempts: 0, captured: {}, deflectTotal: 0, deflectResolved: 0 }`.
  - `awaitInput(kind, onValue)` — sets a pending input handler so the next composer submit is routed to `onValue(text)` instead of keyword matching. `kind` is a label string.
  - `fireEmail({to, subject, body})` and `fireSms({to, body})` — append to the faux inbox / show phone toast (DOM added in Task 5; here call `window.MyerDemoUI.email(...)` / `.sms(...)` which Task 5 defines; guard with `if (window.MyerDemoUI)`).
  - `recordOutcome(kind)` — `kind` is `"resolved"` or `"routed"`; increments counters and renders a badge line (badge DOM in Task 5; guard).
  - These are referenced by the flow data in Task 3 via a `runStep` action hook (see Step 2).

- [ ] **Step 1: Add demo state + input routing to `messaging.js`** (insert after the existing `const C = ...`/state declarations near the top of the closure, before `goToStep`)

```js
  const demoState = { order: null, attempts: 0, captured: {}, deflectTotal: 0, deflectResolved: 0 };
  let pendingInput = null; // { kind, onValue }
  function awaitInput(kind, onValue) { pendingInput = { kind, onValue }; }

  function fireEmail(msg) { if (window.MyerDemoUI && window.MyerDemoUI.email) window.MyerDemoUI.email(msg); }
  function fireSms(msg) { if (window.MyerDemoUI && window.MyerDemoUI.sms) window.MyerDemoUI.sms(msg); }
  function recordOutcome(kind) {
    demoState.deflectTotal += 1;
    if (kind === "resolved") demoState.deflectResolved += 1;
    if (window.MyerDemoUI && window.MyerDemoUI.badge) window.MyerDemoUI.badge(kind);
    if (window.MyerDemoUI && window.MyerDemoUI.counter) window.MyerDemoUI.counter(demoState.deflectResolved, demoState.deflectTotal);
  }
```

- [ ] **Step 2: Add an action hook to `goToStep`** so flow steps can run side-effects and dynamic routing. Modify the existing `goToStep` to call `step.onEnter` (if present) with a small context, and to support `step.dynamicNext` (a function returning the next stepId). Replace the body of the message loop tail:

Find the existing line `renderQuickReplies(step.quickReplies);` at the end of `goToStep` and replace with:

```js
    if (typeof step.onEnter === "function") {
      step.onEnter({ demoState, goToStep, appendBubble, awaitInput, fireEmail, fireSms, recordOutcome,
        W: window.MyerWebchat, maskE: window.MyerWebchat.maskEmail, maskM: window.MyerWebchat.maskMobile,
        renderQuickReplies, renderCrossSell });
    }
    if (typeof step.dynamicNext === "function") {
      const nx = step.dynamicNext({ demoState, W: window.MyerWebchat });
      if (nx) { goToStep(nx); return; }
    }
    renderQuickReplies(step.quickReplies);
```

- [ ] **Step 3: Route composer input to a pending handler when set.** Find the composer submit handler (the block that reads `input.value` and calls `C.matchKeyword`). At the TOP of that handler, after computing `const text = input.value.trim()` and clearing the input + echoing the customer bubble, insert:

```js
    if (pendingInput) {
      const handler = pendingInput; pendingInput = null;
      handler.onValue(text);
      return;
    }
```
(Keep the existing keyword-matching fallback below for when no input is pending.)

- [ ] **Step 4: Add a stub `renderCrossSell` and expose new functions.** Add near the other render helpers:

```js
  function renderCrossSell(items) {
    // Full impl in Task 6; stub renders nothing harmful if called early.
    if (window.MyerDemoUI && window.MyerDemoUI.crossSell) window.MyerDemoUI.crossSell(items);
  }
```

Then extend the exported `window.MyerWidget` object to also include: `demoState, awaitInput, fireEmail, fireSms, recordOutcome`.

- [ ] **Step 5: Verify syntax + that input routing exists**

Run:
```bash
node --check messaging.js && echo "syntax OK"
grep -c "awaitInput" messaging.js   # expect >= 3
grep -c "onEnter" messaging.js      # expect >= 1
grep -c "recordOutcome" messaging.js # expect >= 2
```
Expected: syntax OK; counts at or above the stated minimums.

- [ ] **Step 6: Commit**

```bash
git add messaging.js
git commit -m "feat: engine hooks for input capture, side-effects, and dynamic routing"
```

---

### Task 3: Auth gate + scenario routing (flow data)

**Files:**
- Create: `webchat-flows.js`
- Modify: `index.html` (add `<script src="webchat-flows.js"></script>` after `webchat-data.js`)
- Modify: `conversations.js` (point the widget's first step at the auth gate — see Step 4)

**Interfaces:**
- Consumes: `window.MyerWebchat` (Task 1); the engine action-hook context from Task 2 (`onEnter({demoState, goToStep, appendBubble, awaitInput, fireEmail, fireSms, recordOutcome, W, maskE, maskM, renderQuickReplies, renderCrossSell})`).
- Produces: `window.MyerWebchatFlows.steps` — a map of stepId → step, including `wc_welcome` (entry), `wc_ask_order`, `wc_verify`, `wc_verify_fail`, `wc_route_human`, and references to scenario entry steps `sc_A1..sc_A5`, `sc_B1..sc_B5` (defined in Tasks 4–5). Also `window.MyerWebchatFlows.entryStepId = "wc_welcome"`.

- [ ] **Step 1: Create `webchat-flows.js` with the auth gate**

```js
/* Auth gate + scenario routing for the Myer webchat demo */
window.MyerWebchatFlows = (function () {
  const entryStepId = "wc_welcome";
  const steps = {
    wc_welcome: {
      intro: true,
      messages: [
        { type: "text", text: "Hi! I can track an order or help with a return. What's your order number?" }
      ],
      onEnter: (ctx) => {
        ctx.demoState.order = null; ctx.demoState.attempts = 0; ctx.demoState.captured = {};
        ctx.awaitInput("order", (val) => {
          const order = ctx.W.lookupOrder(val);
          if (!order) { ctx.goToStep("sc_A4"); return; } // ghost order
          ctx.demoState.order = order;
          ctx.goToStep("wc_verify");
        });
      }
    },
    wc_verify: {
      messages: [
        { type: "text", text: "Thanks! Just so I know it's really you — what's the email and mobile on the order?" },
        { type: "note", text: "3-point verification — fit for order, returns and tracking. Account changes would step up to MFA." }
      ],
      onEnter: (ctx) => {
        ctx.awaitInput("verify", (val) => {
          const o = ctx.demoState.order;
          const hay = val.toLowerCase().replace(/\s+/g, "");
          const emailOk = hay.includes(o.email.toLowerCase());
          const mobileOk = hay.includes(o.mobile.replace(/\s+/g, ""));
          if (emailOk && mobileOk) {
            ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. I've got your order up. ✅" });
            ctx.goToStep("sc_" + o.scenario);
          } else {
            ctx.demoState.attempts += 1;
            if (ctx.demoState.attempts >= 2) { ctx.goToStep("wc_route_human"); }
            else { ctx.goToStep("wc_verify_retry"); }
          }
        });
      }
    },
    wc_verify_retry: {
      messages: [{ type: "text", text: "Hmm, those didn't match. Could you try the email and mobile on the order once more?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("verify", (val) => {
          const o = ctx.demoState.order;
          const hay = val.toLowerCase().replace(/\s+/g, "");
          if (hay.includes(o.email.toLowerCase()) && hay.includes(o.mobile.replace(/\s+/g, ""))) {
            ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. ✅" });
            ctx.goToStep("sc_" + o.scenario);
          } else { ctx.goToStep("wc_route_human"); }
        });
      }
    },
    wc_route_human: {
      messages: [{ type: "text", text: "I couldn't match those details — let me connect you to the team." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    }
  };
  return { entryStepId, steps };
})();
```

- [ ] **Step 2: Add the script tag in `index.html`** (after `webchat-data.js`, before `messaging.js`)

```html
  <script src="webchat-data.js"></script>
  <script src="webchat-flows.js"></script>
```

- [ ] **Step 3: Merge webchat steps into the engine's step map.** In `messaging.js`, where the engine resolves steps (the `C.steps[stepId]` lookups inside `goToStep`), make it also consult the webchat steps. Add near the top of the closure (after `const C = window.MyerConversations;`):

```js
  const WF = window.MyerWebchatFlows || { steps: {}, entryStepId: null };
  function getStep(id) { return (WF.steps && WF.steps[id]) || C.steps[id]; }
```
Then replace `const step = C.steps[stepId];` inside `goToStep` with `const step = getStep(stepId);`.
Also support the `intro` flag and `note` message type: in the message loop, handle `msg.type === "note"` by calling `appendSystem(msg.text)` (existing helper), and if `step.intro` render via the existing intro-card path if present, else normal messages. (If the intro-card renderer is keyed only to `welcomeStepId`, generalise it to also trigger when `step.intro === true`.)

- [ ] **Step 4: Repoint the widget's first step to the webchat entry.** In `messaging.js`, find where the widget first renders the welcome on open (`goToStep(C.welcomeStepId)`), and change it to start the webchat entry when present:

```js
    if (!started) { started = true; goToStep((window.MyerWebchatFlows && window.MyerWebchatFlows.entryStepId) || C.welcomeStepId); }
```
Do the same in `reset()`.

- [ ] **Step 5: Verify the auth gate logic with Node**

Run:
```bash
node -e "global.window={}; require('./webchat-data.js'); require('./webchat-flows.js');
const F=window.MyerWebchatFlows; const ids=Object.keys(F.steps);
console.log('entry:', F.entryStepId);
console.log('has verify:', ids.includes('wc_verify'));
console.log('has route_human:', ids.includes('wc_route_human'));"
```
Expected: `entry: wc_welcome`; `has verify: true`; `has route_human: true`.

- [ ] **Step 6: Commit**

```bash
git add webchat-flows.js index.html conversations.js messaging.js
git commit -m "feat: auth gate, verification, and scenario routing for webchat demo"
```

---

### Task 4: WISMO scenarios A1–A5 (flow data)

**Files:**
- Modify: `webchat-flows.js` (add `sc_A1`..`sc_A5` to the `steps` map)

**Interfaces:**
- Consumes: the action-hook context (Task 2), `window.MyerWebchat` order data.
- Produces: steps `sc_A1, sc_A2, sc_A3, sc_A4, sc_A5`. Resolved scenarios call `recordOutcome("resolved")`; routed ones call `recordOutcome("routed")`. Email/SMS sends call `fireEmail`/`fireSms`.

- [ ] **Step 1: Add A1–A5 steps** (insert into the `steps` object in `webchat-flows.js`, before the closing `return`)

```js
    sc_A1: {
      messages: [
        { type: "text", text: "Good news first — nothing's lost! Your order's just coming in two parts." },
        { type: "text", text: "• The jacket shipped first and it's out for delivery today with Australia Post.\n• The two homewares items travel separately and are tracking for Thursday." },
        { type: "text", text: "Want the tracking links?" }
      ],
      quickReplies: [
        { label: "Yes please", next: "sc_A1_send" },
        { label: "No thanks", next: "wc_done" }
      ]
    },
    sc_A1_send: {
      messages: [{ type: "text", text: "Here you go — jacket: [track] · homewares: [track]. I'll pop these in an email and text too, so they're easy to find later. 📩" }],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        ctx.fireEmail({ to: ctx.maskE(o.email), subject: "Your Myer order tracking", body: "Jacket: out for delivery today (Australia Post). Homewares: tracking for Thursday." });
        ctx.fireSms({ to: ctx.maskM(o.mobile), body: "Myer: your order is coming in 2 parts. Jacket today, homewares Thursday. Track: myer.com.au/track" });
        ctx.recordOutcome("resolved");
      },
      quickReplies: [{ label: "That's all, thanks", next: "wc_done" }]
    },
    sc_A2: {
      messages: [{ type: "text", text: "Your order's on its way! It's with Couriers Please, currently \"in transit\", estimated for tomorrow. Here's your live tracking: [track]." }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_A3: {
      messages: [{ type: "text", text: "I'm really sorry — that's frustrating. Because tracking shows it as delivered, I'll get a teammate to open an investigation with the carrier and request proof of delivery. Connecting you now — I've passed your order across so you won't repeat a thing." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
    sc_A4: {
      messages: [{ type: "text", text: "Hmm — I can't find that order on our system, and I want to get this sorted properly for you. Let me hand you to a teammate who can dig into it. One sec." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
    sc_A5: {
      messages: [{ type: "text", text: "Your parcel was delivered today — but the courier left it at your local post office rather than your door (their \"authority to leave\" rule). Here's the collection slip: [link]." }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    wc_done: {
      messages: [{ type: "text", text: "Happy to help. Is there anything else I can do for you today?" }],
      quickReplies: [{ label: "Track another order", next: "wc_welcome" }, { label: "No, thanks", next: "wc_bye" }]
    },
    wc_bye: {
      messages: [{ type: "text", text: "Thanks for shopping with Myer. Have a lovely day! 💙" }],
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
```

- [ ] **Step 2: Verify A1–A5 present and reachable**

Run:
```bash
node -e "global.window={}; require('./webchat-data.js'); require('./webchat-flows.js');
const s=window.MyerWebchatFlows.steps; ['sc_A1','sc_A1_send','sc_A2','sc_A3','sc_A4','sc_A5','wc_done','wc_bye'].forEach(id=>console.log(id, !!s[id]));
let bad=[]; Object.keys(s).forEach(id=>(s[id].quickReplies||[]).forEach(q=>{ if(!s[q.next] && !/^sc_B/.test(q.next)) bad.push(id+'->'+q.next);}));
console.log('dangling (excluding B-scenarios added later):', bad.length?bad:'none');"
```
Expected: all listed ids `true`; dangling = none (B-scenario targets are added in Task 5).

- [ ] **Step 3: Commit**

```bash
git add webchat-flows.js
git commit -m "feat: WISMO scenarios A1-A5"
```

---

### Task 5: Returns scenarios B1–B5 + demo-UI panels (inbox, toast, badge, counter, callout)

**Files:**
- Modify: `webchat-flows.js` (add `sc_B1`..`sc_B5`)
- Modify: `messaging.js` (inject demo-UI mounts; define `window.MyerDemoUI`)
- Modify: `messaging.css` (style inbox panel, phone toast, badge, counter, callout, photo-upload)

**Interfaces:**
- Consumes: action-hook context, `window.MyerWebchat` (incl. `checkInventory`).
- Produces:
  - `window.MyerDemoUI` with `email({to,subject,body})`, `sms({to,body})`, `badge("resolved"|"routed")`, `counter(resolved,total)`, `crossSell(items)`, `callout()`.
  - Steps `sc_B1..sc_B5` including the B3 inventory branch and B1 photo-upload step.

- [ ] **Step 1: Add B1–B5 steps to `webchat-flows.js`**

```js
    sc_B1: {
      messages: [{ type: "text", text: "Sorry it turned up faulty — let's fix that. Could you snap a quick photo of the fault? That lets me process it on the spot instead of you waiting on a manual review." }],
      quickReplies: [{ label: "📷 Upload photo", next: "sc_B1_label" }]
    },
    sc_B1_label: {
      messages: [
        { type: "text", text: "Got it, thank you. All sorted — and no postage to pay on a faulty item." },
        { type: "text", text: "How would you like your prepaid return label?" }
      ],
      quickReplies: [
        { label: "Email it", next: "sc_B1_email" },
        { label: "Text it", next: "sc_B1_text" },
        { label: "Show QR for drop-off", next: "sc_B1_qr" }
      ]
    },
    sc_B1_email: {
      messages: [{ type: "text", text: "Done — label's on its way to your email. Print it or show the QR at any Aus Post. As soon as it's scanned, your refund's on its way. 💸" }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your prepaid Myer return label",body:"Faulty item — prepaid label attached. No postage to pay."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B1_text: {
      messages: [{ type: "text", text: "Done — label's on its way to your mobile. Print it or show the QR at any Aus Post. As soon as it's scanned, your refund's on its way. 💸" }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireSms({to:ctx.maskM(o.mobile),body:"Myer: your prepaid return label is ready. Show the QR at any Aus Post. No postage to pay."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B1_qr: {
      messages: [{ type: "text", text: "Here's your drop-off QR — show it at any Aus Post. As soon as it's scanned, your refund's on its way. 💸" }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B2: {
      messages: [{ type: "text", text: "No worries — you're well inside the 30-day window. Change-of-mind returns are at your cost, so postage is on you this time. Want the label by email or text?" }],
      quickReplies: [
        { label: "Email", next: "sc_B2_email" },
        { label: "Text", next: "sc_B2_text" }
      ]
    },
    sc_B2_email: {
      messages: [{ type: "text", text: "Sent to your email with instructions. Attach it, drop it off, and we'll refund once it's back with us." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your Myer return label",body:"Change-of-mind return — label and instructions attached. Postage at customer's cost."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B2_text: {
      messages: [{ type: "text", text: "Sent to your mobile with instructions. Attach it, drop it off, and we'll refund once it's back with us." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireSms({to:ctx.maskM(o.mobile),body:"Myer: your change-of-mind return label is ready. Postage at your cost. Drop at any Aus Post."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B3: {
      messages: [
        { type: "text", text: "Oh no — let's get you the right fit rather than just sending it back." },
        { type: "text", text: "Would you like the same dress in a larger size instead of a refund?" }
      ],
      quickReplies: [
        { label: "Yes, a size 12", next: "sc_B3_check" },
        { label: "Just refund instead", next: "sc_B3_refund" }
      ]
    },
    sc_B3_check: {
      messages: [],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        const ok = ctx.W.checkInventory(o.data.product, o.data.wantSize, o.data.store);
        ctx.goToStep(ok ? "sc_B3_instock" : "sc_B3_oos");
      }
    },
    sc_B3_instock: {
      messages: [
        { type: "text", text: "Great news — we've got the size 12 in stock at Myer Chadstone. 🎉" },
        { type: "text", text: "A couple of options:" }
      ],
      quickReplies: [
        { label: "Click & collect at Chadstone today", next: "sc_B3_cc" },
        { label: "Post it to me", next: "sc_B3_post" },
        { label: "Just refund instead", next: "sc_B3_refund" }
      ]
    },
    sc_B3_cc: {
      messages: [{ type: "text", text: "Done! Your size 12 is reserved at Chadstone — collection desk, Level 2. I've sent the collection details and your prepaid return label for the size 10 to your email and phone. Bring the size 10 in when you collect and we'll handle the swap on the spot. No postage either way. ✅" }],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        ctx.fireEmail({ to: ctx.maskE(o.email), subject: "Your Chadstone click & collect + return label", body: "Size 12 reserved at Myer Chadstone (collection desk, Level 2). Prepaid return label for size 10 attached." });
        ctx.fireSms({ to: ctx.maskM(o.mobile), body: "Myer: size 12 reserved at Chadstone, Level 2. Bring your size 10 to swap. Details emailed." });
        ctx.recordOutcome("resolved");
        ctx.renderCrossSell([
          { brand: "SEED HERITAGE", title: "Leather Ankle Boot", img: "https://content-us-5.content-cms.com/af9094ac-4ec2-4ea9-8480-e7ef2c8369de/dxresources/6618/6618ba15-8068-4b0b-8681-31ca7e11cb28.jpg?output-format=webp" },
          { brand: "TRENERY", title: "Wool Scarf", img: "https://content-us-5.content-cms.com/af9094ac-4ec2-4ea9-8480-e7ef2c8369de/dxresources/c743/c7436019-9f7f-405c-915e-a6c6b9a43b36.jpg?output-format=webp" }
        ]);
      },
      quickReplies: [{ label: "Perfect, thanks", next: "wc_done" }]
    },
    sc_B3_post: {
      messages: [{ type: "text", text: "No problem — I'll post the size 12 out to you and include a prepaid label for the size 10. No postage either way. ✅" }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your Myer exchange",body:"Size 12 on its way; prepaid return label for size 10 attached."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B3_oos: {
      messages: [{ type: "text", text: "Ah — that size isn't in stock anywhere right now. I can order it in for you, or refund instead. What would you prefer?" }],
      quickReplies: [
        { label: "Order it in", next: "sc_B3_post" },
        { label: "Refund", next: "sc_B3_refund" }
      ]
    },
    sc_B3_refund: {
      messages: [{ type: "text", text: "No problem at all — I've set up your return and prepaid label. Your refund lands as soon as it's scanned. 💸" }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B4: {
      messages: [{ type: "text", text: "Oh no, sorry about that! For something that's arrived damaged you don't need to send anything back — please keep it. I'm processing your refund now… done. It'll land in 3–5 business days. Anything else?" }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "That's all", next: "wc_bye" }, { label: "Track an order", next: "wc_welcome" }]
    },
    sc_B5: {
      messages: [{ type: "text", text: "This one's supplied by one of our marketplace partners, so the return runs through them. I'm raising it now and a specialist will email you the next steps within one business day. I've logged everything so you won't need to re-explain." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Thanks", next: "wc_bye" }]
    },
```

- [ ] **Step 2: Inject demo-UI mounts and define `window.MyerDemoUI` in `messaging.js`** (add after the widget root `innerHTML` is set; append the panels to `document.body`)

```js
  // ---- Demo UI: faux inbox, phone toast, deflection counter, badges, cross-sell, callout ----
  (function setupDemoUI() {
    const inbox = document.createElement("div"); inbox.id = "mw-inbox"; inbox.className = "mw-inbox";
    inbox.innerHTML = `<div class="mw-inbox__head">📧 Inbox <span class="mw-inbox__sub">demo</span></div><div class="mw-inbox__list" id="mw-inbox-list"></div>`;
    const phone = document.createElement("div"); phone.id = "mw-phone-toast"; phone.className = "mw-phone-toast";
    const counter = document.createElement("div"); counter.id = "mw-counter"; counter.className = "mw-counter";
    counter.textContent = "0 of 0 enquiries resolved without an agent";
    document.body.appendChild(inbox); document.body.appendChild(phone); document.body.appendChild(counter);

    window.MyerDemoUI = {
      email(msg) {
        const list = document.getElementById("mw-inbox-list");
        const item = document.createElement("div"); item.className = "mw-inbox__item";
        item.innerHTML = `<div class="mw-inbox__from">Myer &lt;noreply@myer.com.au&gt;</div><div class="mw-inbox__subj">${esc(msg.subject)}</div><div class="mw-inbox__to">to ${esc(msg.to)}</div><div class="mw-inbox__body">${esc(msg.body)}</div>`;
        list.prepend(item); inbox.classList.add("mw-inbox--show");
      },
      sms(msg) {
        phone.innerHTML = `<div class="mw-phone-toast__app">Messages · now</div><div class="mw-phone-toast__from">MYER</div><div class="mw-phone-toast__body">${esc(msg.body)}</div><div class="mw-phone-toast__to">${esc(msg.to)}</div>`;
        phone.classList.add("mw-phone-toast--show");
        clearTimeout(phone._t); phone._t = setTimeout(() => phone.classList.remove("mw-phone-toast--show"), 6000);
      },
      badge(kind) {
        const row = document.createElement("div"); row.className = "mw-row mw-row--bot";
        const label = kind === "resolved" ? "✅ Resolved instantly" : "👤 Routed to specialist";
        row.innerHTML = `<div class="mw-badge mw-badge--${esc(kind)}">${label}</div>`;
        messagesEl.appendChild(row); scrollDown();
      },
      counter(resolved, total) {
        counter.textContent = `${resolved} of ${total} enquiries resolved without an agent`;
        counter.classList.add("mw-counter--show");
      },
      crossSell(items) {
        const row = document.createElement("div"); row.className = "mw-row mw-row--bot";
        const tiles = items.map((i) => `<div class="mw-xsell__tile"><div class="mw-xsell__img" style="background-image:url('${encodeURI(i.img)}')"></div><div class="mw-xsell__brand">${esc(i.brand)}</div><div class="mw-xsell__title">${esc(i.title)}</div></div>`).join("");
        row.innerHTML = `<div class="mw-xsell"><div class="mw-xsell__head">While you're here, these go well with it:</div><div class="mw-xsell__tiles">${tiles}</div></div>`;
        messagesEl.appendChild(row); scrollDown();
      },
      callout() {
        let el = document.getElementById("mw-callout");
        if (el) { el.remove(); return; }
        el = document.createElement("div"); el.id = "mw-callout"; el.className = "mw-callout";
        el.innerHTML = `<button class="mw-callout__x" aria-label="Close">✕</button><h4>One chat — not five systems</h4><p>This whole journey happened in a single Agentforce chat, replacing the current spread:</p><ul><li>Genesys / Oration</li><li>Freshdesk</li><li>BSP</li><li>ShipIT</li></ul>`;
        document.body.appendChild(el);
        el.querySelector(".mw-callout__x").addEventListener("click", () => el.remove());
      }
    };
  })();
```

- [ ] **Step 3: Add demo-UI CSS to `messaging.css`** (append)

```css
/* ---- Demo UI ---- */
.mw-inbox { position: fixed; top: 90px; right: 24px; width: 280px; max-height: 60vh; background: #fff; border: 1px solid #e3e3e3; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); z-index: 9998; overflow: hidden; transform: translateY(8px); opacity: 0; pointer-events: none; transition: opacity .25s, transform .25s; }
.mw-inbox--show { opacity: 1; transform: translateY(0); pointer-events: auto; }
.mw-inbox__head { background: #000; color: #fff; padding: 10px 14px; font-weight: 600; font-size: 14px; }
.mw-inbox__sub { float: right; font-size: 11px; opacity: .6; font-weight: 400; }
.mw-inbox__list { overflow-y: auto; max-height: calc(60vh - 40px); }
.mw-inbox__item { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
.mw-inbox__from { color: #767676; font-size: 11px; }
.mw-inbox__subj { font-weight: 700; margin: 2px 0; }
.mw-inbox__to { color: #767676; font-size: 11px; }
.mw-inbox__body { margin-top: 4px; color: #333; }
.mw-phone-toast { position: fixed; bottom: 24px; right: 24px; width: 250px; background: #1c1c1e; color: #fff; border-radius: 16px; padding: 12px 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.4); z-index: 9998; transform: translateY(20px); opacity: 0; pointer-events: none; transition: opacity .3s, transform .3s; }
.mw-phone-toast--show { opacity: 1; transform: translateY(0); }
.mw-phone-toast__app { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .5px; }
.mw-phone-toast__from { font-weight: 700; font-size: 13px; margin-top: 3px; }
.mw-phone-toast__body { font-size: 13px; margin-top: 2px; }
.mw-phone-toast__to { font-size: 11px; opacity: .55; margin-top: 4px; }
.mw-badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 14px; }
.mw-badge--resolved { background: #e6f5ea; color: #1f8a4c; }
.mw-badge--routed { background: #fdeef0; color: #c8102e; }
.mw-counter { position: fixed; bottom: 24px; left: 110px; background: #000; color: #fff; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 20px; z-index: 9997; opacity: 0; transition: opacity .3s; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.mw-counter--show { opacity: 1; }
.mw-xsell { background: #fff; border: 1px solid #e3e3e3; border-radius: 12px; padding: 12px; max-width: 300px; }
.mw-xsell__head { font-size: 12px; color: #767676; margin-bottom: 8px; }
.mw-xsell__tiles { display: flex; gap: 8px; }
.mw-xsell__tile { width: 50%; }
.mw-xsell__img { height: 90px; border-radius: 8px; background-size: cover; background-position: center; background-color: #eee; }
.mw-xsell__brand { font-size: 10px; font-weight: 700; letter-spacing: .5px; margin-top: 5px; }
.mw-xsell__title { font-size: 12px; }
.mw-callout { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 340px; background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); padding: 24px; z-index: 10000; }
.mw-callout h4 { font-size: 18px; margin-bottom: 8px; }
.mw-callout p { font-size: 13px; color: #444; margin-bottom: 10px; }
.mw-callout ul { font-size: 13px; padding-left: 18px; color: #c8102e; }
.mw-callout__x { position: absolute; top: 12px; right: 12px; border: 0; background: #f0f0f0; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; }
.mw-photo-chip { font-style: italic; }
```

- [ ] **Step 4: Verify all B-steps present + no dangling targets across the whole flow set**

Run:
```bash
node -e "global.window={}; require('./webchat-data.js'); require('./webchat-flows.js');
const s=window.MyerWebchatFlows.steps;
['sc_B1','sc_B1_label','sc_B1_email','sc_B1_text','sc_B1_qr','sc_B2','sc_B2_email','sc_B2_text','sc_B3','sc_B3_check','sc_B3_instock','sc_B3_cc','sc_B3_post','sc_B3_oos','sc_B3_refund','sc_B4','sc_B5'].forEach(id=>{ if(!s[id]) console.log('MISSING',id); });
let bad=[]; Object.keys(s).forEach(id=>(s[id].quickReplies||[]).forEach(q=>{ if(!s[q.next]) bad.push(id+'->'+q.next);}));
console.log('dangling quickReply targets:', bad.length?bad:'none');
console.log('total steps:', Object.keys(s).length);"
```
Expected: no `MISSING` lines; dangling = none; total steps printed.

- [ ] **Step 5: `node --check` messaging.js**

Run: `node --check messaging.js && echo OK`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add webchat-flows.js messaging.js messaging.css
git commit -m "feat: Returns scenarios B1-B5 + demo UI (inbox, SMS toast, badges, counter, cross-sell, callout)"
```

---

### Task 6: Channel-callout trigger, README, and full browser walkthrough

**Files:**
- Modify: `messaging.js` (add a small "Demo" affordance in the header to trigger `MyerDemoUI.callout()`)
- Modify: `README.md`

**Interfaces:**
- Consumes: everything prior.
- Produces: a way to show the channel-consolidation callout during a demo; updated docs.

- [ ] **Step 1: Add a callout trigger.** In the widget header actions (where the reset `↻` and close `✕` buttons are created in the root `innerHTML`), add a button:

```html
<button class="mw-iconbtn" id="mw-callout-btn" title="Channel consolidation" aria-label="Channel consolidation">☰</button>
```
And wire it after the header is in the DOM:
```js
  const calloutBtn = document.getElementById("mw-callout-btn");
  if (calloutBtn) calloutBtn.addEventListener("click", () => { if (window.MyerDemoUI) window.MyerDemoUI.callout(); });
```

- [ ] **Step 2: Update `README.md`** — replace the demo-script section with the webchat version:

```markdown
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
```

- [ ] **Step 3: Full headless walkthrough** — serve and drive the key flows via the browser. Run a static server, then in a headless browser (or manually) verify each:
  - Open widget → intro asks for order number.
  - Enter `M1000001`, then `jane@email.com 0412 345 789` → split-delivery flow; "Yes please" → email appears in inbox + SMS toast; ✅ Resolved badge; counter increments.
  - Reset, enter `M2000003`, verify → too-small flow → "Yes, a size 12" → in-stock at Chadstone → "Click & collect" → email + SMS fire, cross-sell tiles render, ✅ badge.
  - Reset, enter `M1000004` (ghost) → routed-to-human; 👤 Routed badge.
  - Enter a wrong verification twice → routed to team.
  - Header ☰ → channel callout appears; ✕ closes it.
  - Type `<img src=x onerror=alert(1)>` at any input → renders as inert text (esc holds).
  - No console errors.

Use this serve command and confirm 200s:
```bash
python3 -m http.server 8821 >/dev/null 2>&1 & sleep 1
for f in "" index.html styles.css messaging.css conversations.js webchat-data.js webchat-flows.js messaging.js; do printf "/$f "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8821/$f; done
kill %1 2>/dev/null
```
Expected: all 200.

Fix any issues found inline (CSS overlaps, z-index of inbox/toast vs widget — widget window/launcher are 9999; inbox/toast 9998; counter 9997; callout 10000 intentionally above to be modal).

- [ ] **Step 4: Commit**

```bash
git add messaging.js README.md
git commit -m "feat: channel-consolidation callout trigger + README; full walkthrough"
```

---

## Self-Review

**Spec coverage:**
- Auth gate (order capture, 3-point verify, fail-twice→human, MFA tooltip, ghost order) → Task 3 + Task 1 data. ✓
- WISMO A1–A5 → Task 4. ✓
- Returns B1–B5 incl. photo upload (B1) and inventory→Chadstone C&C (B3) with OOS fallback → Task 5. ✓
- Deterministic order→scenario map → Task 1 data + Task 3 routing. ✓
- Mock email AND SMS visibly on screen → Task 5 (`MyerDemoUI.email`/`.sms`, inbox + toast). ✓
- PII masking → Task 1 (`maskEmail`/`maskMobile`), used in all send copy. ✓
- Resolved/routed badge → Task 5 (`badge`). ✓
- Deflection counter → Task 2 state + Task 5 `counter`. ✓
- Cross-sell after return → Task 5 (`crossSell`, fired in B3 C&C). ✓
- Channel-consolidation callout → Task 5 (`callout`) + Task 6 trigger. ✓
- Proactive split-delivery option → A1 messages lead with "coming in two parts" (covers the intent). ✓
- Replace welcome with auth gate → Task 3 Step 4. ✓
- Vanilla/no-build, preserve esc()/safeColor, Myer Concierge design, Aussie spelling → Global Constraints, honoured throughout. ✓
- Out-of-scope statement → README (Task 6). ✓

**Placeholder scan:** The only stubs (`renderCrossSell` in Task 2, demo-UI guards) are explicitly completed in Task 5 with full code shown. No TBD/“add error handling”/“write tests for the above”. ✓

**Type/name consistency:** `demoState`, `awaitInput`, `fireEmail`, `fireSms`, `recordOutcome`, `renderCrossSell`, `getStep`, `window.MyerWebchat` (`lookupOrder`/`checkInventory`/`maskEmail`/`maskMobile`/`orders`/`inventory`), `window.MyerWebchatFlows` (`steps`/`entryStepId`), `window.MyerDemoUI` (`email`/`sms`/`badge`/`counter`/`crossSell`/`callout`), step ids (`wc_*`, `sc_A*`, `sc_B*`) are defined and referenced consistently across tasks. `onEnter(ctx)` context keys match between Task 2 (provider) and Tasks 3–5 (consumers). ✓
