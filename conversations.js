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
