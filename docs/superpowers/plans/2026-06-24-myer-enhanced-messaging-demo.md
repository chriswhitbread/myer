# Myer Enhanced Messaging Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained static demo site — a faithful rebuild of the current myer.com.au homepage with a Salesforce-styled Enhanced Messaging chat widget that runs four scripted, guided conversation flows (Returns, Inventory, Order Status, Agent Handoff / MYER one).

**Architecture:** Plain HTML + CSS + vanilla JS, no build step, no server dependency. The homepage backdrop, the widget rendering/interaction layer, and the data-driven conversation flows are kept in separate files. A small step-engine renders whatever the current conversation step declares; flows are pure data.

**Tech Stack:** HTML5, CSS3 (fl/grid, no preprocessor), vanilla ES6 JavaScript (no framework, no bundler). Inline SVG for icons/logo. Product thumbnails via remote placeholder image URLs so the demo is fully self-contained with no binary assets to manage.

## Global Constraints

- No build step: the site must run by opening `index.html` directly in a browser or via any static file server.
- No framework, no bundler, no npm dependencies. Vanilla ES6 only.
- No real Salesforce org and no real backend — the widget is simulated.
- Myer navy primary `#001952`; white; light-grey bot bubbles `#f1f1f3`; warm agent accent `#c8102e` (Myer red). Use these exact values.
- Widget anchored bottom-right; chat window ~380px wide × ~600px tall.
- Bot persona name: "Myer Assist". Agent persona: "Sarah" / "Sarah from Myer".
- Every flow ends with an "Anything else?" option returning to the welcome menu.
- "Verification" steps are manual browser checks (this is a static demo, no test runner). Each is a concrete, observable pass/fail.

---

### Task 1: Project skeleton and homepage shell

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `messaging.css` (empty placeholder, linked)
- Create: `messaging.js` (empty placeholder, linked)
- Create: `conversations.js` (empty placeholder, linked)

**Interfaces:**
- Consumes: nothing.
- Produces: `index.html` linking `styles.css`, `messaging.css`, `conversations.js`, `messaging.js` (in that order — conversations data must load before the widget that reads it). A `<div id="myer-messaging-root"></div>` mount point placed just before `</body>` for the widget.

- [ ] **Step 1: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MYER</title>
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="messaging.css" />
</head>
<body>
  <!-- Homepage sections added in later tasks -->
  <div id="myer-messaging-root"></div>
  <script src="conversations.js"></script>
  <script src="messaging.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css` base**

```css
:root {
  --myer-navy: #001952;
  --myer-red: #c8102e;
  --bot-bubble: #f1f1f3;
  --page-bg: #ffffff;
  --text: #1a1a1a;
  --muted: #6b6b6b;
  --border: #e3e3e3;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Helvetica Neue", Arial, sans-serif;
  color: var(--text);
  background: var(--page-bg);
  line-height: 1.4;
}
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
.container { max-width: 1280px; margin: 0 auto; padding: 0 20px; }
```

- [ ] **Step 3: Create empty placeholder files**

Create `messaging.css`, `messaging.js`, and `conversations.js` each containing a single header comment, e.g. `/* messaging widget styles — Task 6+ */`.

- [ ] **Step 4: Verify the shell loads**

Run: `open index.html` (macOS) or open the file in a browser.
Expected: A blank white page, no console errors, all four linked files load (check DevTools Network tab → 200/`from disk`, no 404).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css messaging.css messaging.js conversations.js
git commit -m "feat: project skeleton and homepage shell"
```

---

### Task 2: Top utility bar and announcement banner

**Files:**
- Modify: `index.html` (add header utility bar as first child of `<body>`)
- Modify: `styles.css` (utility bar styles)

**Interfaces:**
- Consumes: `.container` and CSS vars from Task 1.
- Produces: a `<div class="utility-bar">` rendered at the very top.

- [ ] **Step 1: Add the utility bar markup** (insert as first element inside `<body>`, before `#myer-messaging-root`)

```html
<div class="utility-bar">
  <div class="container utility-bar__inner">
    <span class="utility-bar__msg">STOCKTAKE SALE · UP TO 40% OFF WOMEN'S FASHION · 50% OFF QUILTS, PILLOWS &amp; MORE · UP TO 30% OFF MEN'S FASHION</span>
  </div>
</div>
```

- [ ] **Step 2: Style the utility bar**

```css
.utility-bar {
  background: var(--myer-navy);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.utility-bar__inner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 34px;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
}
```

- [ ] **Step 3: Verify**

Open `index.html`. Expected: a navy bar across the top with centered white promo text mentioning the Stocktake Sale.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: top utility/announcement bar"
```

---

### Task 3: Primary navigation header (logo, search, category menu, icons)

**Files:**
- Modify: `index.html` (add `<header class="site-header">` after the utility bar)
- Modify: `styles.css` (header + nav styles)

**Interfaces:**
- Consumes: utility bar from Task 2.
- Produces: a `<header class="site-header">` containing the MYER wordmark, a search input, account/wishlist/bag icons, and a horizontal category nav bar with the 12 top-level categories.

- [ ] **Step 1: Add header markup**

```html
<header class="site-header">
  <div class="container site-header__top">
    <a href="#" class="logo" aria-label="MYER home">MYER</a>
    <form class="search" role="search" onsubmit="return false;">
      <input class="search__input" type="search" placeholder="Search for products and brands" />
      <button class="search__btn" aria-label="Search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
    </form>
    <div class="header-icons">
      <a href="#" class="header-icons__item">Sign In</a>
      <a href="#" class="header-icons__item" aria-label="Wishlist">♡</a>
      <a href="#" class="header-icons__item" aria-label="Bag">🛍</a>
    </div>
  </div>
  <nav class="main-nav">
    <ul class="container main-nav__list">
      <li class="main-nav__item main-nav__item--sale">Stocktake Sale</li>
      <li class="main-nav__item">New In</li>
      <li class="main-nav__item">Women</li>
      <li class="main-nav__item">Men</li>
      <li class="main-nav__item">Beauty</li>
      <li class="main-nav__item">Home</li>
      <li class="main-nav__item">Travel &amp; Tech</li>
      <li class="main-nav__item">Kids</li>
      <li class="main-nav__item">Toys</li>
      <li class="main-nav__item">Brands</li>
      <li class="main-nav__item">Gifts</li>
      <li class="main-nav__item">MYER one</li>
    </ul>
  </nav>
</header>
```

- [ ] **Step 2: Style header and nav**

```css
.site-header__top {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 76px;
}
.logo {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--myer-navy);
}
.search { flex: 1; display: flex; max-width: 620px; border: 1px solid var(--border); border-radius: 2px; }
.search__input { flex: 1; border: 0; padding: 11px 14px; font-size: 14px; outline: none; background: #f7f7f7; }
.search__btn { border: 0; background: transparent; padding: 0 12px; cursor: pointer; color: var(--myer-navy); }
.header-icons { display: flex; align-items: center; gap: 18px; font-size: 14px; }
.header-icons__item { font-size: 16px; }
.main-nav { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.main-nav__list { display: flex; gap: 24px; list-style: none; height: 46px; align-items: center; font-size: 14px; font-weight: 600; overflow-x: auto; }
.main-nav__item { cursor: pointer; white-space: nowrap; color: var(--text); }
.main-nav__item:hover { color: var(--myer-navy); }
.main-nav__item--sale { color: var(--myer-red); }
```

- [ ] **Step 3: Verify**

Open `index.html`. Expected: MYER wordmark left, a search box, sign-in/wishlist/bag on the right, and below it a row of 12 category links with "Stocktake Sale" in red.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: primary navigation header"
```

---

### Task 4: Hero banner

**Files:**
- Modify: `index.html` (add `<section class="hero">` after the header)
- Modify: `styles.css` (hero styles)

**Interfaces:**
- Consumes: header from Task 3.
- Produces: a full-width hero with headline, subcopy, and CTA over a background image (remote placeholder URL).

- [ ] **Step 1: Add hero markup**

```html
<section class="hero">
  <div class="hero__overlay">
    <div class="container">
      <p class="hero__eyebrow">STOCKTAKE SALE</p>
      <h1 class="hero__title">Huge Savings Across the Store</h1>
      <p class="hero__sub">Don't miss great deals on Fashion, Beauty, Homewares and More.</p>
      <a href="#" class="hero__cta">Shop the Sale</a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Style hero**

```css
.hero {
  background: linear-gradient(120deg, #001952 0%, #1d3a7a 100%);
  background-size: cover;
  background-position: center;
  color: #fff;
}
.hero__overlay { padding: 96px 0; background: rgba(0,0,0,0.12); }
.hero__eyebrow { font-size: 14px; letter-spacing: 3px; font-weight: 700; opacity: 0.9; }
.hero__title { font-size: 52px; font-weight: 800; margin: 12px 0; line-height: 1.05; }
.hero__sub { font-size: 18px; max-width: 520px; opacity: 0.95; }
.hero__cta {
  display: inline-block; margin-top: 26px; background: #fff; color: var(--myer-navy);
  font-weight: 700; padding: 14px 34px; border-radius: 2px; letter-spacing: 0.5px;
}
.hero__cta:hover { background: #f0f0f0; }
```

- [ ] **Step 3: Verify**

Open `index.html`. Expected: a tall navy gradient hero with eyebrow, large headline, subcopy, and a white "Shop the Sale" button.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: hero banner"
```

---

### Task 5: Promotional tile grid, category grid, and footer

**Files:**
- Modify: `index.html` (add promo tiles, category grid, footer after the hero)
- Modify: `styles.css` (tiles, grid, footer styles)

**Interfaces:**
- Consumes: hero from Task 4.
- Produces: three promo tiles, a category grid, and a multi-column footer. This completes the homepage backdrop.

- [ ] **Step 1: Add promo + category + footer markup**

```html
<section class="container promo-grid">
  <a class="promo-tile" href="#">
    <div class="promo-tile__img" style="background:linear-gradient(135deg,#d7c4b8,#b89a86)"></div>
    <div class="promo-tile__body"><h3>Women's Fashion</h3><p>Up to 40% off</p></div>
  </a>
  <a class="promo-tile" href="#">
    <div class="promo-tile__img" style="background:linear-gradient(135deg,#c2d2e0,#8fb0cc)"></div>
    <div class="promo-tile__body"><h3>Quilts &amp; Pillows</h3><p>50% off</p></div>
  </a>
  <a class="promo-tile" href="#">
    <div class="promo-tile__img" style="background:linear-gradient(135deg,#cdbfe0,#9d86c2)"></div>
    <div class="promo-tile__body"><h3>Men's Fashion</h3><p>Up to 30% off</p></div>
  </a>
</section>

<section class="container category-block">
  <h2 class="section-title">Shop by Category</h2>
  <div class="category-grid">
    <a class="category-card" href="#"><div class="category-card__img" style="background:#e8e1d9"></div><span>Women</span></a>
    <a class="category-card" href="#"><div class="category-card__img" style="background:#dde6ec"></div><span>Men</span></a>
    <a class="category-card" href="#"><div class="category-card__img" style="background:#f0e3e3"></div><span>Beauty</span></a>
    <a class="category-card" href="#"><div class="category-card__img" style="background:#e3ece3"></div><span>Home</span></a>
    <a class="category-card" href="#"><div class="category-card__img" style="background:#e6e0ec"></div><span>Travel &amp; Tech</span></a>
    <a class="category-card" href="#"><div class="category-card__img" style="background:#ece8dd"></div><span>Kids &amp; Toys</span></a>
  </div>
</section>

<footer class="site-footer">
  <div class="container site-footer__cols">
    <div class="footer-col">
      <h4>Customer Service</h4>
      <a href="#">Contact Us</a><a href="#">Delivery</a><a href="#">Returns &amp; Refunds</a><a href="#">FAQs</a>
    </div>
    <div class="footer-col">
      <h4>My Account</h4>
      <a href="#">Sign In</a><a href="#">Order History</a><a href="#">MYER one</a><a href="#">Gift Cards</a>
    </div>
    <div class="footer-col">
      <h4>About Myer</h4>
      <a href="#">Our Story</a><a href="#">Careers</a><a href="#">Store Locator</a><a href="#">Press</a>
    </div>
    <div class="footer-col">
      <h4>Stay Connected</h4>
      <a href="#">Newsletter</a><a href="#">Instagram</a><a href="#">Facebook</a><a href="#">Pinterest</a>
    </div>
  </div>
  <div class="site-footer__legal"><div class="container">© 2026 Myer Pty Ltd. Demo site for Salesforce Enhanced Messaging — not affiliated with Myer.</div></div>
</footer>
```

- [ ] **Step 2: Style promo, category, footer**

```css
.promo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 48px auto; }
.promo-tile { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.promo-tile__img { height: 240px; }
.promo-tile__body { padding: 18px; }
.promo-tile__body h3 { font-size: 18px; }
.promo-tile__body p { color: var(--myer-red); font-weight: 700; margin-top: 4px; }
.section-title { font-size: 24px; margin: 40px 0 20px; }
.category-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 56px; }
.category-card { text-align: center; }
.category-card__img { height: 130px; border-radius: 50%; margin: 0 auto 10px; width: 130px; }
.category-card span { font-size: 14px; font-weight: 600; }
.site-footer { background: #f7f7f7; border-top: 1px solid var(--border); padding-top: 44px; }
.site-footer__cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding-bottom: 36px; }
.footer-col h4 { font-size: 14px; margin-bottom: 14px; }
.footer-col a { display: block; font-size: 13px; color: var(--muted); padding: 5px 0; }
.footer-col a:hover { color: var(--myer-navy); }
.site-footer__legal { border-top: 1px solid var(--border); padding: 18px 0; font-size: 12px; color: var(--muted); }
```

- [ ] **Step 3: Verify**

Open `index.html`. Expected: three promo tiles in a row, a six-item circular category grid, and a four-column footer with a legal disclaimer line. The full homepage now reads as Myer.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: promo tiles, category grid, and footer"
```

---

### Task 6: Conversation data and step engine

**Files:**
- Modify: `conversations.js` (full flow data + helper API)

**Interfaces:**
- Consumes: nothing.
- Produces: a global `window.MyerConversations` object exposing:
  - `welcomeStepId` → string, the entry step id (`"welcome"`).
  - `steps` → object map of `stepId → Step`.
  - `matchKeyword(text)` → returns a stepId for free-text input, or `null`.
  - A `Step` shape: `{ messages: Message[], quickReplies?: QuickReply[], speaker?: "bot"|"agent", agentName?: string, system?: string }`.
  - A `Message` shape: `{ type: "text", text }` OR `{ type: "card", card: {...} }`.
  - Card kinds (the `card.kind` field): `"order"`, `"stock"`, `"tracking"`, `"rewards"`.
  - A `QuickReply` shape: `{ label, next }` where `next` is a stepId.

- [ ] **Step 1: Write the flow data and engine**

Replace the contents of `conversations.js` with:

```js
/* Myer Assist conversation flows + step engine */
window.MyerConversations = (function () {
  const welcomeStepId = "welcome";

  const steps = {
    welcome: {
      messages: [{ type: "text", text: "Hi, I'm Myer Assist 👋 How can I help today?" }],
      quickReplies: [
        { label: "Return an item", next: "ret_order" },
        { label: "Check stock", next: "stk_ask" },
        { label: "Track my order", next: "trk_order" },
        { label: "Check my MYER one rewards", next: "rew_show" },
        { label: "Talk to a person", next: "handoff_connect" }
      ]
    },

    /* ---- Returns ---- */
    ret_order: {
      messages: [
        { type: "text", text: "Sure — I can help with a return. Here's your most recent order:" },
        { type: "card", card: { kind: "order", id: "MYR-48217", item: "Country Road Wool Coat — Camel, Size 12", price: "$299.00", thumb: "#d7c4b8" } },
        { type: "text", text: "Why are you returning this item?" }
      ],
      quickReplies: [
        { label: "Wrong size", next: "ret_method" },
        { label: "Changed my mind", next: "ret_method" },
        { label: "Faulty", next: "ret_method" }
      ]
    },
    ret_method: {
      messages: [{ type: "text", text: "No problem. How would you like to return it?" }],
      quickReplies: [
        { label: "Free post label", next: "ret_label" },
        { label: "Drop at a store", next: "ret_store" }
      ]
    },
    ret_label: {
      messages: [{ type: "text", text: "Done! 🎉 I've emailed a free returns label to you. Once we receive the coat, your refund of $299.00 will be processed to your original payment method within 3–5 business days." }],
      quickReplies: [{ label: "Anything else?", next: "welcome" }]
    },
    ret_store: {
      messages: [{ type: "text", text: "Great choice. Take the item and your order confirmation to any Myer store. Your refund of $299.00 will be processed on the spot. The nearest store is Myer Melbourne (Bourke St)." }],
      quickReplies: [{ label: "Anything else?", next: "welcome" }]
    },

    /* ---- Inventory / stock ---- */
    stk_ask: {
      messages: [{ type: "text", text: "I can check that for you. Which item and size?" }],
      quickReplies: [
        { label: "Nike Air Max — Size 9", next: "stk_show" },
        { label: "Seed Linen Dress — Size 10", next: "stk_show" }
      ]
    },
    stk_show: {
      messages: [
        { type: "text", text: "Here's the live availability:" },
        { type: "card", card: { kind: "stock", item: "Nike Air Max 90 — White, Size 9", online: "In stock online", stores: [
          { name: "Myer Melbourne", status: "in" },
          { name: "Myer Chadstone", status: "low" },
          { name: "Myer Bondi", status: "out" }
        ] } }
      ],
      quickReplies: [
        { label: "Click & Collect at Melbourne", next: "stk_cc" },
        { label: "Notify me when back at Bondi", next: "stk_notify" },
        { label: "Anything else?", next: "welcome" }
      ]
    },
    stk_cc: {
      messages: [{ type: "text", text: "Reserved! 🛍 Your Nike Air Max 90 (Size 9) is held for Click & Collect at Myer Melbourne. You'll get a text when it's ready — usually within 2 hours." }],
      quickReplies: [{ label: "Anything else?", next: "welcome" }]
    },
    stk_notify: {
      messages: [{ type: "text", text: "You're on the list. We'll message you the moment the Nike Air Max 90 (Size 9) is back in stock at Myer Bondi." }],
      quickReplies: [{ label: "Anything else?", next: "welcome" }]
    },

    /* ---- Order status / tracking ---- */
    trk_order: {
      messages: [
        { type: "text", text: "Let's find your order. Here it is:" },
        { type: "card", card: { kind: "order", id: "MYR-51904", item: "Dyson V12 Cordless Vacuum", price: "$799.00", thumb: "#c2d2e0" } },
        { type: "card", card: { kind: "tracking", eta: "Tomorrow by 5:00 PM", steps: [
          { label: "Ordered", done: true },
          { label: "Packed", done: true },
          { label: "Shipped", done: true },
          { label: "Out for delivery", done: false }
        ] } }
      ],
      quickReplies: [
        { label: "My delivery is delayed", next: "trk_delay" },
        { label: "Anything else?", next: "welcome" }
      ]
    },
    trk_delay: {
      messages: [{ type: "text", text: "Sorry to hear that. I've flagged your order as priority and notified the courier. If it doesn't arrive by tomorrow 5 PM, reply here and I'll arrange a replacement or refund right away." }],
      quickReplies: [
        { label: "Talk to a person", next: "handoff_connect" },
        { label: "Anything else?", next: "welcome" }
      ]
    },

    /* ---- MYER one rewards ---- */
    rew_show: {
      messages: [
        { type: "text", text: "Here's your MYER one summary:" },
        { type: "card", card: { kind: "rewards", points: "4,250", credit: "$20.00", tier: "Silver" } },
        { type: "text", text: "You're 750 points away from a $10 Rewards Card. Would you like to use your $20 credit on your next order?" }
      ],
      quickReplies: [
        { label: "Apply my $20 credit", next: "rew_applied" },
        { label: "Anything else?", next: "welcome" }
      ]
    },
    rew_applied: {
      messages: [{ type: "text", text: "Applied! Your $20 MYER one credit will be waiting at checkout on your next order. ✨" }],
      quickReplies: [{ label: "Anything else?", next: "welcome" }]
    },

    /* ---- Agent handoff ---- */
    handoff_connect: {
      messages: [{ type: "text", text: "Connecting you to a specialist…" }],
      quickReplies: [{ label: "(continue)", next: "handoff_agent" }]
    },
    handoff_agent: {
      system: "Sarah joined the conversation",
      speaker: "agent",
      agentName: "Sarah",
      messages: [{ type: "text", text: "Hi, this is Sarah from Myer 👋 I've got your full conversation history here. How can I help you further today?" }],
      quickReplies: [{ label: "Thanks, that's all", next: "handoff_end" }]
    },
    handoff_end: {
      speaker: "agent",
      agentName: "Sarah",
      messages: [{ type: "text", text: "You're very welcome — thanks for shopping with Myer! Have a lovely day. 💙" }],
      quickReplies: [{ label: "Back to start", next: "welcome" }]
    }
  };

  const KEYWORDS = [
    { re: /(return|refund|send back|exchange)/i, step: "ret_order" },
    { re: /(stock|available|availability|in store|size)/i, step: "stk_ask" },
    { re: /(track|where.*order|delivery|shipping|arrive)/i, step: "trk_order" },
    { re: /(reward|myer one|points|loyalty)/i, step: "rew_show" },
    { re: /(agent|human|person|representative|speak|talk)/i, step: "handoff_connect" }
  ];

  function matchKeyword(text) {
    for (const k of KEYWORDS) if (k.re.test(text)) return k.step;
    return null;
  }

  return { welcomeStepId, steps, matchKeyword };
})();
```

- [ ] **Step 2: Verify the data loads**

Open `index.html`, then in DevTools console run:
```js
MyerConversations.steps.welcome.quickReplies.length
MyerConversations.matchKeyword("where is my order")
```
Expected: `5` and `"trk_order"`.

- [ ] **Step 3: Commit**

```bash
git add conversations.js
git commit -m "feat: conversation flow data and keyword matcher"
```

---

### Task 7: Widget shell — launcher and chat window scaffold

**Files:**
- Modify: `messaging.js` (build and mount the widget; launcher open/close)
- Modify: `messaging.css` (launcher + window chrome styles)

**Interfaces:**
- Consumes: `#myer-messaging-root` from Task 1; `window.MyerConversations` from Task 6.
- Produces: a global `window.MyerWidget` with `open()`, `close()`, `toggle()`, and `reset()` (reset is fully implemented in Task 10; stub it here to call the render entry point added in Task 8). Builds DOM: launcher button, window with header (logo text "Myer Assist", online dot, reset + close buttons), a scrollable `.mw-messages` body, and a `.mw-composer` input row.

- [ ] **Step 1: Build the widget scaffold in `messaging.js`**

```js
/* Myer Assist messaging widget */
(function () {
  const C = window.MyerConversations;
  const root = document.getElementById("myer-messaging-root");

  root.innerHTML = `
    <button class="mw-launcher" id="mw-launcher" aria-label="Open Myer Assist">
      <span class="mw-launcher__icon">💬</span>
      <span class="mw-launcher__label">Myer Assist</span>
      <span class="mw-launcher__dot"></span>
    </button>
    <section class="mw-window" id="mw-window" aria-hidden="true">
      <header class="mw-header">
        <div class="mw-header__id">
          <span class="mw-header__logo">MYER</span>
          <div>
            <div class="mw-header__title">Myer Assist</div>
            <div class="mw-header__status"><span class="mw-status-dot"></span>Online now</div>
          </div>
        </div>
        <div class="mw-header__actions">
          <button class="mw-iconbtn" id="mw-reset" title="Restart demo" aria-label="Restart">↻</button>
          <button class="mw-iconbtn" id="mw-close" title="Close" aria-label="Close">✕</button>
        </div>
      </header>
      <div class="mw-messages" id="mw-messages"></div>
      <form class="mw-composer" id="mw-composer">
        <input class="mw-composer__input" id="mw-input" type="text" placeholder="Type a message…" autocomplete="off" />
        <button class="mw-composer__send" type="submit" aria-label="Send">➤</button>
      </form>
    </section>
  `;

  const launcher = document.getElementById("mw-launcher");
  const win = document.getElementById("mw-window");

  function open() { win.classList.add("mw-window--open"); win.setAttribute("aria-hidden", "false"); launcher.classList.add("mw-launcher--hidden"); }
  function close() { win.classList.remove("mw-window--open"); win.setAttribute("aria-hidden", "true"); launcher.classList.remove("mw-launcher--hidden"); }
  function toggle() { win.classList.contains("mw-window--open") ? close() : open(); }

  launcher.addEventListener("click", open);
  document.getElementById("mw-close").addEventListener("click", close);

  // reset/render wired in Tasks 8 & 10
  function reset() { /* replaced in Task 10 */ }

  window.MyerWidget = { open, close, toggle, reset, _root: root, _C: C };
})();
```

- [ ] **Step 2: Style launcher and window chrome in `messaging.css`**

```css
:root { --mw-navy: #001952; --mw-red: #c8102e; --mw-bot: #f1f1f3; }
.mw-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 9999;
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  background: var(--mw-navy); color: #fff; border: 0; border-radius: 28px;
  padding: 12px 20px; font-size: 15px; font-weight: 600; box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}
.mw-launcher__icon { font-size: 18px; }
.mw-launcher__dot { width: 9px; height: 9px; background: #2ecc71; border-radius: 50%; }
.mw-launcher--hidden { display: none; }
.mw-window {
  position: fixed; right: 24px; bottom: 24px; z-index: 9999;
  width: 380px; height: 600px; max-height: calc(100vh - 48px);
  background: #fff; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  display: none; flex-direction: column; overflow: hidden;
}
.mw-window--open { display: flex; }
.mw-header { background: var(--mw-navy); color: #fff; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
.mw-header__id { display: flex; align-items: center; gap: 12px; }
.mw-header__logo { font-weight: 800; letter-spacing: 1px; font-size: 18px; }
.mw-header__title { font-weight: 700; font-size: 15px; }
.mw-header__status { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 6px; }
.mw-status-dot { width: 8px; height: 8px; background: #2ecc71; border-radius: 50%; display: inline-block; }
.mw-header__actions { display: flex; gap: 6px; }
.mw-iconbtn { background: rgba(255,255,255,0.15); color: #fff; border: 0; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px; }
.mw-iconbtn:hover { background: rgba(255,255,255,0.3); }
.mw-messages { flex: 1; overflow-y: auto; padding: 16px; background: #fafafa; display: flex; flex-direction: column; gap: 10px; }
.mw-composer { display: flex; border-top: 1px solid #e3e3e3; padding: 10px; gap: 8px; }
.mw-composer__input { flex: 1; border: 1px solid #e3e3e3; border-radius: 20px; padding: 10px 14px; outline: none; font-size: 14px; }
.mw-composer__send { background: var(--mw-navy); color: #fff; border: 0; width: 40px; border-radius: 50%; cursor: pointer; }
```

- [ ] **Step 3: Verify open/close**

Open `index.html`. Expected: a navy "💬 Myer Assist" launcher bottom-right. Clicking it opens a chat window with a navy header (MYER logo, "Myer Assist", "Online now"), an empty message area, and an input row. The ✕ closes it and the launcher returns. (Messages are still empty — that's Task 8.)

- [ ] **Step 4: Commit**

```bash
git add messaging.js messaging.css
git commit -m "feat: messaging widget shell with launcher and window"
```

---

### Task 8: Message rendering and step playback

**Files:**
- Modify: `messaging.js` (render text bubbles, typing indicator, advance through steps)
- Modify: `messaging.css` (bubble + typing styles)

**Interfaces:**
- Consumes: widget shell + `window.MyerConversations` from Tasks 6–7.
- Produces: internal functions on the widget closure: `goToStep(stepId)` renders a step's messages (with a typing delay between bot messages) then its quick replies; `appendBubble({role, text})`; `showTyping()/hideTyping()`. `goToStep` is exposed via `window.MyerWidget.goToStep` for the composer (Task 9) and reset (Task 10). Cards are rendered by a `renderCard` stub here (text fallback) and fully implemented in Task 11.

- [ ] **Step 1: Add rendering + playback to `messaging.js`** (insert before the `window.MyerWidget = ...` line; then extend the exported object)

```js
  const messagesEl = document.getElementById("mw-messages");
  let currentSpeaker = "bot";
  let currentAgentName = null;

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function appendBubble({ role, text }) {
    const wrap = document.createElement("div");
    wrap.className = "mw-row mw-row--" + role;
    const avatarText = role === "agent" ? (currentAgentName ? currentAgentName[0] : "S") : "M";
    const avatar = role === "customer" ? "" : `<div class="mw-avatar mw-avatar--${role}">${avatarText}</div>`;
    wrap.innerHTML = `${avatar}<div class="mw-bubble mw-bubble--${role}">${text}</div>`;
    messagesEl.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function appendSystem(text) {
    const el = document.createElement("div");
    el.className = "mw-system";
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollDown();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "mw-row mw-row--" + currentSpeaker + " mw-typing-row";
    el.id = "mw-typing";
    const avatarText = currentSpeaker === "agent" ? (currentAgentName ? currentAgentName[0] : "S") : "M";
    el.innerHTML = `<div class="mw-avatar mw-avatar--${currentSpeaker}">${avatarText}</div><div class="mw-bubble mw-bubble--${currentSpeaker} mw-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(el);
    scrollDown();
  }
  function hideTyping() { const t = document.getElementById("mw-typing"); if (t) t.remove(); }

  function clearQuickReplies() {
    messagesEl.querySelectorAll(".mw-quickreplies").forEach((n) => n.remove());
  }

  function renderQuickReplies(replies) {
    if (!replies || !replies.length) return;
    const wrap = document.createElement("div");
    wrap.className = "mw-quickreplies";
    replies.forEach((qr) => {
      const btn = document.createElement("button");
      btn.className = "mw-chip";
      btn.textContent = qr.label;
      btn.addEventListener("click", () => {
        clearQuickReplies();
        if (qr.label !== "(continue)") appendBubble({ role: "customer", text: qr.label });
        goToStep(qr.next);
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function goToStep(stepId) {
    const step = C.steps[stepId];
    if (!step) return;
    clearQuickReplies();
    if (step.speaker) currentSpeaker = step.speaker;
    if (step.agentName) currentAgentName = step.agentName;
    if (step.system) appendSystem(step.system);

    for (const msg of step.messages) {
      showTyping();
      await sleep(650);
      hideTyping();
      if (msg.type === "text") {
        appendBubble({ role: currentSpeaker, text: msg.text });
      } else if (msg.type === "card") {
        renderCard(msg.card); // full impl in Task 11
      }
      await sleep(180);
    }
    renderQuickReplies(step.quickReplies);
  }

  // Stub — replaced in Task 11.
  function renderCard(card) {
    appendBubble({ role: currentSpeaker, text: "[" + card.kind + " card]" });
  }
```

Then change the export line to include the new functions and a `resetSpeaker` helper:

```js
  function resetSpeaker() { currentSpeaker = "bot"; currentAgentName = null; }

  window.MyerWidget = { open, close, toggle, reset, goToStep, resetSpeaker, _root: root, _C: C };
```

- [ ] **Step 2: Style bubbles, avatars, chips, typing, system line in `messaging.css`**

```css
.mw-row { display: flex; align-items: flex-end; gap: 8px; max-width: 88%; }
.mw-row--customer { align-self: flex-end; flex-direction: row-reverse; }
.mw-row--bot, .mw-row--agent { align-self: flex-start; }
.mw-avatar { width: 28px; height: 28px; border-radius: 50%; flex: 0 0 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
.mw-avatar--bot { background: var(--mw-navy); }
.mw-avatar--agent { background: var(--mw-red); }
.mw-bubble { padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; }
.mw-bubble--bot { background: var(--mw-bot); color: #1a1a1a; border-bottom-left-radius: 4px; }
.mw-bubble--agent { background: #fdeef0; color: #1a1a1a; border: 1px solid #f6d3d8; border-bottom-left-radius: 4px; }
.mw-bubble--customer { background: var(--mw-navy); color: #fff; border-bottom-right-radius: 4px; }
.mw-system { align-self: center; font-size: 12px; color: #6b6b6b; background: #ececf0; padding: 5px 12px; border-radius: 12px; }
.mw-quickreplies { display: flex; flex-wrap: wrap; gap: 8px; align-self: flex-start; margin-top: 2px; }
.mw-chip { background: #fff; color: var(--mw-navy); border: 1px solid var(--mw-navy); border-radius: 18px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.mw-chip:hover { background: var(--mw-navy); color: #fff; }
.mw-typing { display: flex; gap: 4px; align-items: center; }
.mw-typing span { width: 7px; height: 7px; background: #b0b0b8; border-radius: 50%; animation: mw-blink 1.2s infinite both; }
.mw-typing span:nth-child(2) { animation-delay: 0.2s; }
.mw-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes mw-blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
```

- [ ] **Step 3: Trigger the welcome step on open**

In `messaging.js`, change the `open` function so it renders the welcome step the first time it opens:

```js
  let started = false;
  function open() {
    win.classList.add("mw-window--open"); win.setAttribute("aria-hidden", "false"); launcher.classList.add("mw-launcher--hidden");
    if (!started) { started = true; goToStep(C.welcomeStepId); }
  }
```

- [ ] **Step 4: Verify playback**

Open `index.html`, click the launcher. Expected: after a brief typing indicator, the welcome message appears with five quick-reply chips. Clicking "Track my order" shows your reply bubble on the right, then bot messages (cards appear as `[order card]`/`[tracking card]` placeholders for now), then new chips. The conversation advances correctly through steps.

- [ ] **Step 5: Commit**

```bash
git add messaging.js messaging.css
git commit -m "feat: message rendering, typing indicator, and step playback"
```

---

### Task 9: Free-text composer with keyword matching

**Files:**
- Modify: `messaging.js` (wire the composer form to keyword matching)

**Interfaces:**
- Consumes: `goToStep`, `appendBubble` from Task 8; `C.matchKeyword` from Task 6.
- Produces: composer submit handler that echoes the typed message, matches a keyword to a step, and either advances or shows a fallback.

- [ ] **Step 1: Add the composer handler in `messaging.js`** (insert before the export line)

```js
  const composer = document.getElementById("mw-composer");
  const input = document.getElementById("mw-input");
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    clearQuickReplies();
    appendBubble({ role: "customer", text });
    const stepId = C.matchKeyword(text);
    if (stepId) {
      goToStep(stepId);
    } else {
      showTyping();
      setTimeout(() => {
        hideTyping();
        appendBubble({ role: "bot", text: "I can help with returns, stock checks, order tracking, MYER one rewards, or connect you to a person. What would you like to do?" });
        renderQuickReplies(C.steps.welcome.quickReplies);
      }, 650);
    }
  });
```

- [ ] **Step 2: Verify free-text matching**

Open `index.html`, open the widget, type `I want to return my coat` and press Enter. Expected: your message appears, then the Returns flow starts (order card + reason chips). Then type `asdfghjkl` → expected: the fallback message with the five menu chips.

- [ ] **Step 3: Commit**

```bash
git add messaging.js
git commit -m "feat: free-text composer with keyword matching"
```

---

### Task 10: Reset / restart demo control

**Files:**
- Modify: `messaging.js` (implement `reset()` and wire the header ↻ button)

**Interfaces:**
- Consumes: `goToStep`, `resetSpeaker`, `messagesEl` from Task 8.
- Produces: a working `reset()` that clears the transcript, resets speaker state, and replays the welcome step. Wired to the `#mw-reset` button.

- [ ] **Step 1: Replace the `reset` stub in `messaging.js`**

```js
  function reset() {
    messagesEl.innerHTML = "";
    resetSpeaker();
    goToStep(C.welcomeStepId);
  }
  document.getElementById("mw-reset").addEventListener("click", reset);
```

Ensure the exported object references this `reset` (it already does by name; confirm no stale stub remains above it — delete the `function reset() { /* replaced in Task 10 */ }` placeholder from Task 7).

- [ ] **Step 2: Verify reset**

Open `index.html`, open the widget, run through the Agent Handoff flow until "Sarah" is the speaker (agent bubbles are red-tinted). Click the header ↻ button. Expected: the transcript clears and the welcome message replays as the bot (grey bubbles) — speaker state is back to bot.

- [ ] **Step 3: Commit**

```bash
git add messaging.js
git commit -m "feat: reset/restart demo control"
```

---

### Task 11: Rich cards (order, stock, tracking, rewards)

**Files:**
- Modify: `messaging.js` (replace `renderCard` stub with real card rendering)
- Modify: `messaging.css` (card styles)

**Interfaces:**
- Consumes: `messagesEl`, `scrollDown`, `currentSpeaker` from Task 8; card data shapes from Task 6.
- Produces: a real `renderCard(card)` that renders four card kinds into the message stream as left-aligned card elements.

- [ ] **Step 1: Replace the `renderCard` stub in `messaging.js`**

```js
  function renderCard(card) {
    const wrap = document.createElement("div");
    wrap.className = "mw-row mw-row--" + currentSpeaker;
    let html = "";
    if (card.kind === "order") {
      html = `<div class="mw-card">
        <div class="mw-card__order">
          <div class="mw-card__thumb" style="background:${card.thumb}"></div>
          <div><div class="mw-card__title">${card.item}</div>
          <div class="mw-card__meta">Order ${card.id}</div>
          <div class="mw-card__price">${card.price}</div></div>
        </div></div>`;
    } else if (card.kind === "stock") {
      const rows = card.stores.map((s) => {
        const icon = s.status === "in" ? "✅" : s.status === "low" ? "⚠️" : "❌";
        const txt = s.status === "in" ? "In stock" : s.status === "low" ? "Low stock" : "Out of stock";
        return `<div class="mw-stock__row"><span>${icon} ${s.name}</span><span class="mw-stock__txt">${txt}</span></div>`;
      }).join("");
      html = `<div class="mw-card">
        <div class="mw-card__title">${card.item}</div>
        <div class="mw-card__online">🟢 ${card.online}</div>
        <div class="mw-stock">${rows}</div></div>`;
    } else if (card.kind === "tracking") {
      const steps = card.steps.map((s) => `<div class="mw-track__step ${s.done ? "is-done" : ""}"><span class="mw-track__dot"></span>${s.label}</div>`).join("");
      html = `<div class="mw-card">
        <div class="mw-card__meta">Estimated delivery</div>
        <div class="mw-card__title">${card.eta}</div>
        <div class="mw-track">${steps}</div></div>`;
    } else if (card.kind === "rewards") {
      html = `<div class="mw-card mw-card--rewards">
        <div class="mw-card__meta">MYER one · ${card.tier}</div>
        <div class="mw-rewards"><div><div class="mw-rewards__num">${card.points}</div><div class="mw-rewards__lbl">points</div></div>
        <div><div class="mw-rewards__num">${card.credit}</div><div class="mw-rewards__lbl">credit</div></div></div></div>`;
    }
    wrap.innerHTML = html;
    messagesEl.appendChild(wrap);
    scrollDown();
  }
```

- [ ] **Step 2: Add card styles in `messaging.css`**

```css
.mw-card { background: #fff; border: 1px solid #e3e3e3; border-radius: 12px; padding: 14px; font-size: 13px; max-width: 300px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.mw-card__order { display: flex; gap: 12px; }
.mw-card__thumb { width: 56px; height: 56px; border-radius: 8px; flex: 0 0 56px; }
.mw-card__title { font-weight: 700; margin-bottom: 3px; }
.mw-card__meta { color: #6b6b6b; font-size: 12px; }
.mw-card__price { font-weight: 700; color: var(--mw-navy); margin-top: 3px; }
.mw-card__online { color: #1f8a4c; margin: 6px 0 10px; font-weight: 600; }
.mw-stock__row { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #f0f0f0; }
.mw-stock__txt { color: #6b6b6b; }
.mw-track { margin-top: 10px; }
.mw-track__step { display: flex; align-items: center; gap: 10px; padding: 5px 0; color: #b0b0b8; font-weight: 600; }
.mw-track__step.is-done { color: #1a1a1a; }
.mw-track__dot { width: 11px; height: 11px; border-radius: 50%; background: #d8d8de; }
.mw-track__step.is-done .mw-track__dot { background: #1f8a4c; }
.mw-card--rewards { border-color: var(--mw-navy); }
.mw-rewards { display: flex; gap: 24px; margin-top: 8px; }
.mw-rewards__num { font-size: 22px; font-weight: 800; color: var(--mw-navy); }
.mw-rewards__lbl { font-size: 12px; color: #6b6b6b; }
```

- [ ] **Step 3: Verify each card kind**

Open `index.html`, open the widget, and run each flow:
- Returns → expect an **order card** (thumbnail, item, order id, price).
- Check stock → expect a **stock card** (green online line + three stores with ✅/⚠️/❌).
- Track my order → expect an **order card** + a **tracking timeline** (first three steps green/dark, "Out for delivery" grey) with ETA.
- MYER one rewards → expect a **rewards card** (points + credit + Silver tier).

Expected: all four render as styled cards, not `[...]` placeholders.

- [ ] **Step 4: Commit**

```bash
git add messaging.js messaging.css
git commit -m "feat: rich cards for order, stock, tracking, and rewards"
```

---

### Task 12: Final polish, README, and full demo walkthrough

**Files:**
- Create: `README.md`
- Modify: `messaging.css` / `styles.css` (only if walkthrough surfaces visual issues)

**Interfaces:**
- Consumes: the complete site.
- Produces: a `README.md` documenting how to run the demo and a script for presenting all four use cases.

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Full walkthrough verification**

Open `index.html` and run every flow end-to-end, including:
- All four flows reach their end and offer "Anything else?" → returns to welcome.
- Handoff: "Sarah joined the conversation" system line appears; agent bubbles are red-tinted; reset returns speaker to bot.
- Free-text: a returns phrase and an unmatched phrase both behave correctly.
- No console errors at any point. Layout of homepage + widget is visually clean.

Fix any visual issues found (spacing, overflow, colour) inline in CSS.

- [ ] **Step 3: Commit**

```bash
git add README.md messaging.css styles.css
git commit -m "docs: add README and final polish"
```

---

## Self-Review

**Spec coverage check:**
- Homepage backdrop (utility bar, nav, hero, promo, category, footer) → Tasks 2–5. ✓
- Three separated concerns (html/css, widget, conversations) → file layout across Tasks 1, 6, 7–11. ✓
- Step-engine, data-driven flows → Task 6. ✓
- Four flows (Returns, Inventory, Order status, Handoff + MYER one) → Task 6 data, exercised in Tasks 8–11. ✓
- Welcome menu + "Anything else?" return → Task 6 data. ✓
- Quick-reply guided flow + free-text keyword fallback → Tasks 8 (chips) and 9 (free-text). ✓
- Widget visuals (launcher, window, bubbles, typing, chips, rich cards, handoff treatment, reset) → Tasks 7, 8, 10, 11. ✓
- Colours/personas/sizing constraints → Global Constraints, applied in CSS tasks. ✓
- No build step / vanilla / simulated → Global Constraints + Task 1. ✓
- Out-of-scope items (no cart, no real org, no backend) → respected; nothing in the plan adds them. ✓

**Placeholder scan:** The only intentional stubs (`renderCard`, `reset`) are explicitly replaced in named later tasks (11 and 10) with full code shown. No "TBD"/"add error handling"/"write tests for the above". ✓

**Type/name consistency:** `goToStep`, `appendBubble`, `showTyping`/`hideTyping`, `clearQuickReplies`, `renderQuickReplies`, `renderCard`, `resetSpeaker`, `currentSpeaker`, `messagesEl`, `scrollDown` are defined in Task 8 and reused with identical names in Tasks 9–11. `MyerConversations` API (`welcomeStepId`, `steps`, `matchKeyword`) defined in Task 6, consumed via `C.` consistently. Card kinds (`order`/`stock`/`tracking`/`rewards`) match between Task 6 data and Task 11 rendering. ✓
