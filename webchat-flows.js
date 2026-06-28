/* Auth gate + scenario routing for the Myer webchat demo */
window.MyerWebchatFlows = (function () {
  const entryStepId = "wc_welcome";
  const steps = {
    wc_welcome: {
      intro: true,
      messages: [
        { type: "text", text: "Hi, how can I help you today? I'm a Virtual Agent, not a real person, but I know lots about Myer." },
        { type: "text", text: "Please type your enquiry, or select from the list below:" }
      ],
      onEnter: (ctx) => {
        ctx.demoState.order = null; ctx.demoState.attempts = 0; ctx.demoState.captured = {};
      },
      quickReplies: [
        { label: "Where is my delivery?", next: "wc_pick_order" },
        { label: "I need to return an item.", next: "rt_start" }
      ]
    },

    /* ============================================================
       Return an item: guided flow (identify → verify by code →
       reason → confirm label → process → offer bigger size at
       Chadstone with pickup/send). Uses demo order M2000003.
       ============================================================ */
    rt_start: {
      messages: [{ type: "text", text: "Happy to help with a return. What's the email or order number on the order?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("rt_identify", (val) => {
          // Demo: accept ANY email or order number. Match a real record if one
          // exists; otherwise proceed with the demo order so the flow always works.
          const v = val.trim();
          const order =
            ctx.W.lookupOrder(v) ||
            Object.values(ctx.W.orders).find(o => o.email.toLowerCase() === v.toLowerCase()) ||
            ctx.W.lookupOrder("M2000003");
          ctx.demoState.order = order;
          ctx.goToStep("rt_verify_choice");
        });
      }
    },
    rt_verify_choice: {
      messages: [
        { type: "text", text: "Thanks. To keep your details safe, can you provide an order number, or would you prefer a code sent to your mobile or email?" }
      ],
      onEnter: (ctx) => {
        ctx.awaitInput("rt_verify_choice", (val) => {
          const v = val.trim();
          // Route typed replies the same way the quick-reply chips do.
          if (/^m?\d{6,}$/i.test(v.replace(/\s/g, ""))) {
            const order = ctx.W.lookupOrder(v) || ctx.demoState.order || ctx.W.lookupOrder("M2000003");
            ctx.demoState.order = order;
            ctx.goToStep("rt_verified");
          } else if (/\b(email|mail|inbox)\b/i.test(v)) {
            ctx.goToStep("rt_code_email");
          } else if (/\b(text|sms|mobile|phone|message)\b/i.test(v)) {
            ctx.goToStep("rt_code_sms");
          } else {
            ctx.goToStep("rt_order_number");
          }
        });
      },
      quickReplies: [
        { label: "Provide an order number", next: "rt_order_number" },
        { label: "Text me a code", next: "rt_code_sms" },
        { label: "Email me a code", next: "rt_code_email" }
      ]
    },
    rt_order_number: {
      messages: [{ type: "text", text: "No problem, what's the order number?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("rt_order_number", (val) => {
          // Demo: accept any order number; match a real record if one exists.
          const order = ctx.W.lookupOrder(val.trim()) || ctx.demoState.order || ctx.W.lookupOrder("M2000003");
          ctx.demoState.order = order;
          ctx.goToStep("rt_verified");
        });
      }
    },
    rt_code_sms: {
      messages: [{ type: "text", text: "Sent! Check your phone for a 6-digit code." }],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        ctx.fireSms({ to: ctx.maskM(o.mobile), body: "Your one-time verification code is 4–8–2–9–1–7. It expires in 10 minutes." });
        // Accept the typed code (any value, for the demo) as well as the chip.
        ctx.awaitInput("rt_code_sms", () => ctx.goToStep("rt_verified"));
      },
      quickReplies: [{ label: "I've entered the code", next: "rt_verified" }]
    },
    rt_code_email: {
      messages: [{ type: "text", text: "Sent! Check your inbox for a 6-digit code." }],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        ctx.fireEmail({ to: ctx.maskE(o.email), subject: "Your Myer verification code", body: "Your one-time verification code is 482917. It expires in 10 minutes." });
        ctx.awaitInput("rt_code_email", () => ctx.goToStep("rt_verified"));
      },
      quickReplies: [{ label: "I've entered the code", next: "rt_verified" }]
    },
    rt_verified: {
      messages: [
        { type: "text", text: "Perfect, you're verified." },
        { type: "text", text: "Here are your orders from the past 90 days. Which one is your return related to? If you're not sure, just tell me the item." }
      ],
      onEnter: (ctx) => {
        const W = ctx.W;
        // Build a pill per recent order, with a product summary beneath it.
        const recent = ["M2000003", "M2000006", "M2000007"];
        const chips = recent.map((id) => {
          const o = W.lookupOrder(id);
          return {
            label: o.data.orderedOn + " · " + id + " · " + o.data.total,
            desc: W.orderSummary(o),
            next: "rt_pick_product",
            order: id
          };
        });
        chips.push({ label: "It's a different order", next: "rt_other_order" });
        ctx.renderQuickReplies(chips);
        // If the user instead types an item ("not sure, tan shoes"), search all
        // their orders, match it, and jump straight to the reason step.
        const email = (ctx.demoState.order && ctx.demoState.order.email) || "";
        ctx.awaitInput("rt_verified", async (val) => {
          const hit = W.findItemAcrossOrders(email, val);
          if (hit) {
            ctx.demoState.order = hit.order;
            ctx.demoState.lineItem = hit.item;
            await ctx.botSay("Found it, that's from order " + hit.order.orderNumber + " on " + hit.order.data.orderedOn + ".");
            ctx.goToStep("rt_confirm_item");
          } else {
            await ctx.botSay("I couldn't find that one, let's try by order. Pick the order it was in below.");
            ctx.goToStep("rt_verified");
          }
        });
      }
    },
    rt_other_order: {
      messages: [{ type: "text", text: "No problem, what's the order number?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("rt_other_order", (val) => {
          // Use the matched order only if it carries line items; otherwise fall
          // back to the demo order so the product-matching flow always works.
          const matched = ctx.W.lookupOrder(val.trim());
          const order = (matched && matched.data && matched.data.lineItems) ? matched : ctx.W.lookupOrder("M2000003");
          ctx.demoState.order = order;
          ctx.demoState.lineItem = null;
          ctx.goToStep("rt_pick_product");
        });
      }
    },
    rt_pick_product: {
      messages: [{ type: "text", text: "Thanks. That order has a few items. Which product would you like to return?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("rt_pick_product", (val) => {
          // Fuzzy-match the typed product against the order's line items.
          const item = ctx.W.findLineItem(ctx.demoState.order, val);
          ctx.demoState.lineItem = item;
          ctx.goToStep("rt_confirm_item");
        });
      }
    },
    rt_confirm_item: {
      messages: [{ type: "text", text: "Thanks. I've matched this item from your order. Is this the one you'd like to return?" }],
      onEnter: (ctx) => {
        const li = ctx.demoState.lineItem || (ctx.demoState.order.data.lineItems || [])[0];
        ctx.demoState.lineItem = li;
        const o = ctx.demoState.order;
        const sizePart = li.size ? ", Size " + li.size : "";
        ctx.renderCard({ kind: "order", id: o.orderNumber, item: li.product + ", " + li.colour + sizePart, price: li.price, thumb: li.thumb, img: li.img });
        ctx.renderQuickReplies([
          { label: "Yes, that's it", next: "rt_reason" },
          { label: "No, a different item", next: "rt_pick_product" }
        ]);
      }
    },
    rt_reason: {
      messages: [{ type: "text", text: "Got it. What's the reason for the return?" }],
      onEnter: (ctx) => {
        // Accept a typed reason as well as the chips; any reason routes onward.
        ctx.awaitInput("rt_reason", () => ctx.goToStep("rt_worn"));
      },
      quickReplies: [
        { label: "Too small", next: "rt_worn" },
        { label: "Too big", next: "rt_worn" },
        { label: "Changed my mind", next: "rt_worn" },
        { label: "Faulty", next: "rt_worn" }
      ]
    },
    rt_worn: {
      messages: [{ type: "text", text: "Has it been used or worn?" }],
      quickReplies: [
        { label: "No, unused", next: "rt_return_done" },
        { label: "Yes", next: "rt_worn_yes" }
      ]
    },
    rt_worn_yes: {
      messages: [{ type: "text", text: "No problem, used items can still be returned if they're faulty or not as described. I'll have a team member take a quick look and follow up by email within one business day. Is there anything else I can help with?" }],
      onEnter: (ctx) => { ctx.recordOutcome("escalated"); },
      quickReplies: [{ label: "That's all, thanks", next: "wc_bye" }]
    },
    rt_return_done: {
      messages: [],
      onEnter: async (ctx) => {
        const o = ctx.demoState.order;
        const li = ctx.demoState.lineItem || (o.data.lineItems || [])[0];
        const sizePart = li.size ? ", Size " + li.size : "";
        const desc = li.product + " (" + li.colour + sizePart + ")";
        await ctx.botSay("Perfect. Because it's unused and within the 30-day window, this can be returned free of charge, no postage to pay.");
        await ctx.botSay("I've emailed a free prepaid return label to your inbox to print. Drop the parcel at any Australia Post and your refund of " + li.price + " lands as soon as it's scanned.");
        ctx.fireEmail({ to: ctx.maskE(o.email), subject: "Your Myer return label", body: "Return for order " + o.orderNumber + ": " + desc + ". Free prepaid label attached to print. Refund " + li.price + " on scan.",
          attachment: { name: "Myer-Return-Label-" + o.orderNumber + ".pdf", size: "142 KB" } });
        ctx.recordOutcome("resolved");
      },
      // Only offer the size-exchange stock pitch for sized items (e.g. footwear/apparel).
      dynamicNext: (ctx) => {
        const li = (ctx.demoState && ctx.demoState.lineItem) || {};
        return li.wantSize ? "rt_stock_info" : "rt_done_plain";
      }
    },
    rt_done_plain: {
      messages: [{ type: "text", text: "Is there anything else I can help with?" }],
      quickReplies: [{ label: "That's all, thanks", next: "wc_bye" }]
    },
    rt_stock_info: {
      messages: [],
      onEnter: async (ctx) => {
        const li = ctx.demoState.lineItem;
        await ctx.botSay("By the way, if you'd like to try the next size up, the size " + li.wantSize + " is in stock nearby:");
        ctx.renderCard({ kind: "stock", item: li.product + ", " + li.colour + ", Size " + li.wantSize, online: "In stock online",
          stores: [
            { name: "Myer Chadstone (your local)", status: "in" },
            { name: "Myer Southland (~11km)", status: "low" }
          ] });
        await ctx.botSay("No need to decide now, just thought it might help. Anything else I can do?");
        ctx.renderQuickReplies([{ label: "That's all, thanks", next: "wc_bye" }]);
      }
    },

    /* ---- Order picker (chip-driven; sets the active order, then verifies) ---- */
    wc_pick_order: {
      messages: [{ type: "text", text: "Sure, which order is it? (Pick one for the demo.)" }],
      quickReplies: [
        { label: "Split delivery", order: "M1000001", next: "wc_verify" },
        { label: "In transit", order: "M1000002", next: "wc_verify" },
        { label: "Says delivered, not received", order: "M1000003", next: "wc_verify" },
        { label: "Authority to leave", order: "M1000005", next: "wc_verify" },
        { label: "Faulty item", order: "M2000001", next: "wc_verify" },
        { label: "Changed my mind", order: "M2000002", next: "wc_verify" },
        { label: "Wrong size", order: "M2000003", next: "wc_verify" },
        { label: "Arrived damaged", order: "M2000004", next: "wc_verify" },
        { label: "Marketplace item", order: "M2000005", next: "wc_verify" },
        { label: "An order I can't find", order: "M9999999", next: "wc_ghost" }
      ]
    },
    wc_ghost: {
      messages: [],
      onEnter: (ctx) => { ctx.demoState.order = null; },
      dynamicNext: () => "sc_A4"
    },
    wc_verify: {
      messages: [
        { type: "text", text: "Thanks! Just so I know it's really you, what's the email and mobile on the order?" },
        { type: "note", text: "3-point verification: fit for order, returns and tracking. Account changes would step up to MFA." }
      ],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        if (!o) { ctx.goToStep("sc_A4"); return; }
        // Demo: accept whatever they enter and proceed.
        ctx.awaitInput("verify", () => {
          ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. I've got your order up." });
          ctx.goToStep("sc_" + o.scenario);
        });
      },
      quickReplies: [{ label: "Use the order's details", next: "wc_verify_auto" }]
    },
    wc_verify_auto: {
      messages: [],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        if (!o) { ctx.goToStep("sc_A4"); return; }
        ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. I've got your order up." });
        ctx.goToStep("sc_" + o.scenario);
      }
    },

    /* ---- Knowledge / FAQ (no order needed) ---- */
    wc_knowledge: {
      messages: [{ type: "text", text: "Happy to help. What would you like to know?" }],
      quickReplies: [
        { label: "Delivery times & cost", next: "wc_kn_delivery" },
        { label: "Returns policy", next: "wc_kn_returns" },
        { label: "Store locations & hours", next: "wc_kn_stores" },
        { label: "MYER one rewards", next: "wc_kn_myerone" },
        { label: "Gift cards", next: "wc_kn_giftcards" }
      ]
    },
    wc_kn_delivery: {
      messages: [
        { type: "text", text: "Standard delivery is 3–7 business days, and it's free on orders over $99 (a $10 flat rate under that). Express is 1–3 business days. Free Click & Collect is usually ready within 2 hours at your chosen store." }
      ],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Ask something else", next: "wc_knowledge" }, { label: "That's all, thanks", next: "wc_bye" }]
    },
    wc_kn_returns: {
      messages: [
        { type: "text", text: "You've got 30 days to return most items for a refund or exchange, and they just need to be unworn with tags and proof of purchase. Faulty or damaged items can be returned any time, and we cover the postage. Beauty, earrings and a few other items have hygiene exclusions." }
      ],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Ask something else", next: "wc_knowledge" }, { label: "Start a return", next: "wc_pick_order" }]
    },
    wc_kn_stores: {
      messages: [
        { type: "text", text: "We've got over 50 stores across Australia. Most are open 9am–6pm weekdays, 9am–5pm weekends, with extended hours late-night and during sale events. Want me to find your nearest store? Just share a suburb or postcode." }
      ],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Ask something else", next: "wc_knowledge" }, { label: "That's all, thanks", next: "wc_bye" }]
    },
    wc_kn_myerone: {
      messages: [
        { type: "text", text: "MYER one is our free rewards program: you earn 2 Credits per $1 on eligible purchases, and every 2,000 Credits becomes a $10 Rewards Card. Members also get bonus-Credit events, birthday treats and exclusive offers." }
      ],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Ask something else", next: "wc_knowledge" }, { label: "That's all, thanks", next: "wc_bye" }]
    },
    wc_kn_giftcards: {
      messages: [
        { type: "text", text: "Myer gift cards work in-store and online, are valid for 3 years from purchase, and can be topped up from $20 to $1,000. Lost a digital one? I can resend it to the email on the order." }
      ],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Ask something else", next: "wc_knowledge" }, { label: "That's all, thanks", next: "wc_bye" }]
    },
    wc_verify_retry: {
      messages: [{ type: "text", text: "Hmm, those didn't match. Could you try the email and mobile on the order once more?" }],
      onEnter: (ctx) => {
        ctx.awaitInput("verify", (val) => {
          const o = ctx.demoState.order;
          const hay = val.toLowerCase().replace(/\s+/g, "");
          if (hay.includes(o.email.toLowerCase()) && hay.includes(o.mobile.replace(/\s+/g, ""))) {
            ctx.appendBubble({ role: "bot", text: "Perfect, that checks out." });
            ctx.goToStep("sc_" + o.scenario);
          } else { ctx.goToStep("wc_route_human"); }
        });
      }
    },
    wc_route_human: {
      messages: [{ type: "text", text: "I couldn't match those details, so let me connect you to the team." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
    sc_A1: {
      messages: [
        { type: "text", text: "Good news first: nothing's lost! Your order's just coming in two parts." },
        { type: "text", text: "• The jacket shipped first and it's out for delivery today with Australia Post.\n• The two homewares items travel separately and are tracking for Thursday." },
        { type: "text", text: "Want the tracking links?" }
      ],
      quickReplies: [
        { label: "Yes please", next: "sc_A1_send" },
        { label: "No thanks", next: "wc_done" }
      ]
    },
    sc_A1_send: {
      messages: [{ type: "text", text: "Here you go, jacket: [track] · homewares: [track]. I'll pop these in an email and text too, so they're easy to find later." }],
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
      messages: [{ type: "text", text: "I'm really sorry, that's frustrating. Because tracking shows it as delivered, I'll get a teammate to open an investigation with the carrier and request proof of delivery. Connecting you now, and I've passed your order across so you won't repeat a thing." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
    sc_A4: {
      messages: [{ type: "text", text: "Hmm, I can't find that order on our system, and I want to get this sorted properly for you. Let me hand you to a teammate who can dig into it. One sec." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    },
    sc_A5: {
      messages: [{ type: "text", text: "Your parcel was delivered today, but the courier left it at your local post office rather than your door (their \"authority to leave\" rule). Here's the collection slip: [link]." }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B1: {
      messages: [{ type: "text", text: "Sorry it turned up faulty, let's fix that. Could you snap a quick photo of the fault? That lets me process it on the spot instead of you waiting on a manual review." }],
      quickReplies: [{ label: "Upload photo", next: "sc_B1_label" }]
    },
    sc_B1_label: {
      messages: [
        { type: "text", text: "Got it, thank you. All sorted, and no postage to pay on a faulty item." },
        { type: "text", text: "How would you like your prepaid return label?" }
      ],
      quickReplies: [
        { label: "Email it", next: "sc_B1_email" },
        { label: "Text it", next: "sc_B1_text" },
        { label: "Show QR for drop-off", next: "sc_B1_qr" }
      ]
    },
    sc_B1_email: {
      messages: [{ type: "text", text: "Done, label's on its way to your email. Print it or show the QR at any Aus Post. As soon as it's scanned, your refund's on its way." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your prepaid Myer return label",body:"Faulty item: prepaid label attached. No postage to pay."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B1_text: {
      messages: [{ type: "text", text: "Done, label's on its way to your mobile. Print it or show the QR at any Aus Post. As soon as it's scanned, your refund's on its way." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireSms({to:ctx.maskM(o.mobile),body:"Myer: your prepaid return label is ready. Show the QR at any Aus Post. No postage to pay."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B1_qr: {
      messages: [{ type: "text", text: "Here's your drop-off QR, show it at any Aus Post. As soon as it's scanned, your refund's on its way." }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B2: {
      messages: [{ type: "text", text: "No worries, you're well inside the 30-day window. Change-of-mind returns are at your cost, so postage is on you this time. Want the label by email or text?" }],
      quickReplies: [
        { label: "Email", next: "sc_B2_email" },
        { label: "Text", next: "sc_B2_text" }
      ]
    },
    sc_B2_email: {
      messages: [{ type: "text", text: "Sent to your email with instructions. Attach it, drop it off, and we'll refund once it's back with us." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your Myer return label",body:"Change-of-mind return: label and instructions attached. Postage at customer's cost."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B2_text: {
      messages: [{ type: "text", text: "Sent to your mobile with instructions. Attach it, drop it off, and we'll refund once it's back with us." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireSms({to:ctx.maskM(o.mobile),body:"Myer: your change-of-mind return label is ready. Postage at your cost. Drop at any Aus Post."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B3: {
      messages: [
        { type: "text", text: "Oh no, let's get you the right fit rather than just sending it back." },
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
        { type: "text", text: "Great news, we've got the size 12 in stock at Myer Chadstone." },
        { type: "text", text: "A couple of options:" }
      ],
      quickReplies: [
        { label: "Click & collect at Chadstone today", next: "sc_B3_cc" },
        { label: "Post it to me", next: "sc_B3_post" },
        { label: "Just refund instead", next: "sc_B3_refund" }
      ]
    },
    sc_B3_cc: {
      messages: [{ type: "text", text: "Done! Your size 12 is reserved at Chadstone, collection desk, Level 2. I've sent the collection details and your prepaid return label for the size 10 to your email and phone. Bring the size 10 in when you collect and we'll handle the swap on the spot. No postage either way." }],
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
      messages: [{ type: "text", text: "No problem, I'll post the size 12 out to you and include a prepaid label for the size 10. No postage either way." }],
      onEnter: (ctx) => { const o=ctx.demoState.order; ctx.fireEmail({to:ctx.maskE(o.email),subject:"Your Myer exchange",body:"Size 12 on its way; prepaid return label for size 10 attached."}); ctx.recordOutcome("resolved"); },
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B3_oos: {
      messages: [{ type: "text", text: "Ah, that size isn't in stock anywhere right now. I can order it in for you, or refund instead. What would you prefer?" }],
      quickReplies: [
        { label: "Order it in", next: "sc_B3_post" },
        { label: "Refund", next: "sc_B3_refund" }
      ]
    },
    sc_B3_refund: {
      messages: [{ type: "text", text: "No problem at all, I've set up your return and prepaid label. Your refund lands as soon as it's scanned." }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "Thanks", next: "wc_done" }]
    },
    sc_B4: {
      messages: [{ type: "text", text: "Oh no, sorry about that! For something that's arrived damaged you don't need to send anything back, please keep it. I'm processing your refund now… done. It'll land in 3–5 business days. Anything else?" }],
      onEnter: (ctx) => ctx.recordOutcome("resolved"),
      quickReplies: [{ label: "That's all", next: "wc_bye" }, { label: "Track an order", next: "wc_welcome" }]
    },
    sc_B5: {
      messages: [{ type: "text", text: "This one's supplied by one of our marketplace partners, so the return runs through them. I'm raising it now and a specialist will email you the next steps within one business day. I've logged everything so you won't need to re-explain." }],
      onEnter: (ctx) => ctx.recordOutcome("routed"),
      quickReplies: [{ label: "Thanks", next: "wc_bye" }]
    },
    wc_done: {
      messages: [{ type: "text", text: "Happy to help. Is there anything else I can do for you today?" }],
      quickReplies: [{ label: "Track another order", next: "wc_welcome" }, { label: "No, thanks", next: "wc_bye" }]
    },
    wc_bye: {
      messages: [{ type: "text", text: "Thanks for shopping with Myer. Have a lovely day!" }],
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    }
  };
  return { entryStepId, steps };
})();
