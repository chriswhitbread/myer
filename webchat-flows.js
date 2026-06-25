/* Auth gate + scenario routing for the Myer webchat demo */
window.MyerWebchatFlows = (function () {
  const entryStepId = "wc_welcome";
  const steps = {
    wc_welcome: {
      intro: true,
      messages: [
        { type: "text", text: "Hi, welcome to Myer! 👋 How can I help today?" }
      ],
      onEnter: (ctx) => {
        ctx.demoState.order = null; ctx.demoState.attempts = 0; ctx.demoState.captured = {};
      },
      quickReplies: [
        { label: "Track my order", next: "wc_pick_order" },
        { label: "Return an item", next: "rt_start" },
        { label: "Something arrived damaged", next: "wc_pick_order" },
        { label: "Ask a question", next: "wc_knowledge" }
      ]
    },

    /* ============================================================
       Return an item — email-first guided flow:
         email → confirm by 6-digit code (email or phone ending 51) →
         list the 3 orders from the past month → pick an order →
         return the whole order OR pick a line item → reason →
         confirm label → process → size-up exchange (nearest in-stock
         store, e.g. Chadstone). Driven by webchat-data.js.

       Best-practice basis (see README): structured return-reason
       options, item- and order-level returns, and a proactive
       exchange-before-refund offer to retain the sale.
       ============================================================ */
    rt_start: {
      messages: [{ type: "text", text: "Happy to help with a return. What's the email address on your Myer account?" }],
      onEnter: (ctx) => {
        ctx.demoState.orderIndex = undefined; ctx.demoState.returnIndex = undefined;
        ctx.awaitInput("rt_email", (val) => {
          // Demo: accept any email; fall back to the demo customer so the
          // flow always has orders to work with.
          ctx.demoState.customer = ctx.W.lookupCustomer(val.trim());
          ctx.goToStep("rt_verify_choice");
        });
      },
      quickReplies: [{ label: "Use my account email", next: "rt_use_email" }]
    },
    rt_use_email: {
      messages: [],
      onEnter: (ctx) => { ctx.demoState.customer = ctx.W.lookupCustomer("chris@email.com"); },
      dynamicNext: () => "rt_verify_choice"
    },
    rt_verify_choice: {
      messages: [
        { type: "text", text: "Thanks — I've found your order. Can I send you a 6-digit code to confirm it's you? I can send it to your email or your phone ending 51." }
      ],
      quickReplies: [
        { label: "Phone ending 51", next: "rt_code_sms" },
        { label: "Email", next: "rt_code_email" }
      ]
    },
    rt_code_sms: {
      messages: [{ type: "text", text: "The 6-digit code has been sent to your phone ending 51. 📱 Pop it in below when it arrives." }],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        ctx.fireSms({ to: ctx.maskM(c.mobile), body: "Myer: your one-time verification code is 4–8–2–9–1–7. It expires in 10 minutes." });
        // Accept any code the shopper enters (demo).
        ctx.awaitInput("rt_code", () => ctx.goToStep("rt_orders"));
      }
    },
    rt_code_email: {
      messages: [{ type: "text", text: "The 6-digit code has been sent to your email. 📩 Pop it in below when it arrives." }],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer verification code", body: "Your one-time verification code is 482917. It expires in 10 minutes." });
        ctx.awaitInput("rt_code", () => ctx.goToStep("rt_orders"));
      }
    },

    /* ---- Verified: list the orders from the past month, pick one ---- */
    rt_orders: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        ctx.appendBubble({ role: "bot", text: `Perfect, you're verified. ✅ Welcome back, ${c.name}.` });
        ctx.appendBubble({ role: "bot", text: `You've made ${c.orders.length} orders in the past month. Which one is the return from?` });
        const chips = c.orders.map((o, i) => {
          const lead = o.items[0].product;
          const more = o.items.length > 1 ? ` +${o.items.length - 1} more` : "";
          return { label: `${o.placed} · ${lead}${more} — $${ctx.W.orderTotal(o).toFixed(2)}`, orderIdx: i, next: "rt_order_detail" };
        });
        chips.push({ label: "None of these", next: "rt_none" });
        ctx.renderQuickReplies(chips);
      }
    },
    rt_none: {
      messages: [{ type: "text", text: "No problem. If it's an older order or something still on its way, let me know the order number and I'll take a look — or I can connect you to the team." }],
      quickReplies: [
        { label: "Start over", next: "rt_start" },
        { label: "That's all, thanks", next: "wc_bye" }
      ]
    },

    /* ---- Order picked: eligibility check, then whole order or line item ---- */
    rt_order_detail: {
      messages: [],
      onEnter: (ctx) => {
        const o = ctx.demoState.customer.orders[ctx.demoState.orderIndex];
        ctx.appendBubble({ role: "bot", text: `Order ${o.id} — ${o.delivered}. Here's what was in it:` });
        o.items.forEach((it) => ctx.renderCard({
          kind: "order", id: o.id,
          item: `${it.product} — ${it.variant}, Size ${it.size}`,
          price: `$${it.price.toFixed(2)}`,
          thumb: it.thumb
        }));
        // Eligibility: everything delivered in the last 30 days is in-window.
        // Hygiene items (e.g. socks/underwear) are flagged as not returnable.
        ctx.appendBubble({ role: "bot", text: "✓ All delivered within the last 30 days, so they're inside the returns window." });
        const excluded = o.items.filter((it) => !ctx.W.returnableItem(it));
        excluded.forEach((it) => ctx.appendBubble({ role: "bot", text: `🚫 Heads up: the ${it.product} is a hygiene item, so it can't be returned once opened.` }));
        const returnable = o.items.filter((it) => ctx.W.returnableItem(it));
        ctx.appendBubble({ role: "bot", text: "Would you like to return the whole order, or just one item?" });
        const chips = o.items
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => ctx.W.returnableItem(it))
          .map(({ it, i }) => ({ label: `Just the ${it.product}`, returnItem: i, next: "rt_reason" }));
        if (returnable.length > 1) chips.unshift({ label: "Return the whole order", next: "rt_whole" });
        ctx.renderQuickReplies(chips);
      }
    },

    /* ---- Whole-order return ---- */
    rt_whole: {
      messages: [],
      onEnter: (ctx) => {
        const o = ctx.demoState.customer.orders[ctx.demoState.orderIndex];
        const count = o.items.filter((it) => ctx.W.returnableItem(it)).length;
        const total = ctx.W.orderTotal(o);
        ctx.appendBubble({ role: "bot", text: `No worries — returning all ${count} eligible items from order ${o.id}, $${total.toFixed(2)} in total.` });
        ctx.appendBubble({ role: "bot", text: "I'll email and text a single prepaid label covering the whole order once you confirm. Nothing's processed until you say go." });
        ctx.renderQuickReplies([
          { label: "Confirm return", next: "rt_whole_done" },
          { label: "Actually, just one item", next: "rt_order_detail" }
        ]);
      }
    },
    rt_whole_done: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const o = c.orders[ctx.demoState.orderIndex];
        const count = o.items.filter((it) => ctx.W.returnableItem(it)).length;
        const total = ctx.W.orderTotal(o);
        ctx.appendBubble({ role: "bot", text: "Done! ✅ Your return is set up and a single prepaid label is on its way to your email and phone." });
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer return label", body: `Return for order ${o.id} (${count} items). Prepaid label attached.` });
        ctx.fireSms({ to: ctx.maskM(c.mobile), body: `Myer: your prepaid return label for order ${o.id} is ready. Drop at any Aus Post.` });
        // Retention: choose how to get the money back (store credit vs card).
        ctx.demoState.refundAmount = total;
        ctx.demoState.refundLabel = `order ${o.id}`;
        ctx.goToStep("rt_refund_choice");
      }
    },

    /* ---- Reason for return (structured options + free text; routes faulty) ---- */
    rt_reason: {
      messages: [],
      onEnter: (ctx) => {
        const it = ctx.demoState.customer.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        ctx.appendBubble({ role: "bot", text: `Good choice to sort it now. Why are you returning the ${it.product}?` });
        // Size/fit is ~45% of returns, so it leads. Faulty routes to a photo
        // + inspection path; "Something else" captures a free-text reason.
        ctx.renderQuickReplies([
          { label: "Too small", next: "rt_label" },
          { label: "Too big", next: "rt_label" },
          { label: "Changed my mind", next: "rt_label" },
          { label: "Faulty or damaged", next: "rt_faulty" },
          { label: "Something else", next: "rt_reason_other" }
        ]);
      }
    },
    rt_reason_other: {
      messages: [],
      onEnter: (ctx) => {
        ctx.appendBubble({ role: "bot", text: "No problem — tell me in your own words and I'll note it on the return." });
        ctx.awaitInput("rt_reason_free", (val) => {
          ctx.demoState.returnReason = val.trim() || "Other";
          ctx.demoState.reasonIsFree = true;
          ctx.goToStep("rt_label");
        });
      }
    },
    rt_label: {
      messages: [],
      onEnter: (ctx) => {
        // The chip the customer just tapped is their reason — capture it,
        // unless we already captured a free-text reason.
        if (!ctx.demoState.reasonIsFree) ctx.demoState.returnReason = ctx.demoState.lastChip || "";
        ctx.demoState.reasonIsFree = false;
        const it = ctx.demoState.customer.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        const sizeReason = ctx.demoState.returnReason === "Too small" || ctx.demoState.returnReason === "Too big";
        ctx.appendBubble({ role: "bot", text: "No worries. Here's your return summary — please check before I process it:" });
        ctx.renderCard({
          kind: "order", id: ctx.demoState.customer.orders[ctx.demoState.orderIndex].id,
          item: `${it.product} — ${it.variant}, Size ${it.size}`,
          price: `Refund $${it.price.toFixed(2)}`,
          thumb: it.thumb
        });
        // Reason-based postage: exchanges/size returns are free (we want the
        // item back to swap); change-of-mind is at the customer's cost.
        ctx.appendBubble({ role: "bot", text: sizeReason
          ? "Return postage is on us for this one. 📦"
          : "Heads up: change-of-mind returns are $9.95 return postage (waived if you take store credit). 📦" });
        ctx.appendBubble({ role: "bot", text: "I'll email and text a prepaid label once you confirm. Nothing's processed until you say go." });
        ctx.renderQuickReplies([
          { label: "Confirm return", next: "rt_processed" },
          { label: "Not yet", next: "rt_hold" }
        ]);
      }
    },

    /* ---- Faulty / damaged: photo → instant approval → inspection routing ---- */
    rt_faulty: {
      messages: [],
      onEnter: (ctx) => {
        ctx.demoState.returnReason = "Faulty";
        ctx.appendBubble({ role: "bot", text: "Sorry to hear that — faulty items are free to return and we cover the postage." });
        ctx.appendBubble({ role: "bot", text: "A quick photo lets me approve it on the spot and route it to inspection instead of restock. Want to add one?" });
        ctx.renderQuickReplies([
          { label: "📷 Add a photo", next: "rt_faulty_resolve" },
          { label: "Skip the photo", next: "rt_faulty_resolve" }
        ]);
      }
    },
    rt_faulty_resolve: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const it = c.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        ctx.appendBubble({ role: "bot", text: "Thanks — that's approved and flagged for our quality team. How would you like us to make it right?" });
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer faulty-item return", body: `Faulty ${it.product} (${it.id}). Free prepaid label attached; flagged for inspection, not restock.` });
        const chips = [];
        if (it.apparel && it.sizeUp) chips.push({ label: "Replace it (same item)", next: "rt_send" });
        chips.push({ label: "Refund me", next: "rt_refund_choice_setup" });
        // Low-value faulty items: keep it and refund anyway (no return postage).
        if (it.price <= 30) chips.push({ label: "Keep it + refund", next: "rt_keep_refund" });
        ctx.renderQuickReplies(chips);
      }
    },
    rt_keep_refund: {
      messages: [],
      onEnter: (ctx) => {
        const it = ctx.demoState.customer.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        ctx.appendBubble({ role: "bot", text: `Done — no need to send it back. We'll refund $${it.price.toFixed(2)} to your original payment in 3–5 business days. 💸` });
        ctx.recordOutcome("resolved");
        ctx.renderQuickReplies([{ label: "That's all, thanks", next: "wc_bye" }]);
      }
    },
    rt_hold: {
      messages: [{ type: "text", text: "No problem — I'll hold off. Your return isn't processed. Just pick \"Confirm return\" whenever you're ready." }],
      quickReplies: [
        { label: "Confirm return", next: "rt_processed" },
        { label: "Maybe later", next: "wc_bye" }
      ]
    },
    rt_processed: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const o = c.orders[ctx.demoState.orderIndex];
        const it = o.items[ctx.demoState.returnIndex];
        ctx.appendBubble({ role: "bot", text: "Done! ✅ Your return is set up and a prepaid label is on its way to your email and phone." });
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer return label", body: `Return ${o.id} — ${it.product} (Size ${it.size}). Prepaid label attached.` });
        ctx.fireSms({ to: ctx.maskM(c.mobile), body: "Myer: your prepaid return label is ready. Drop at any Aus Post." });
        ctx.demoState.refundAmount = it.price;
        ctx.demoState.refundLabel = it.product;
        // Size/fit returns → try to save the sale with a size swap first.
        // Everything else goes straight to the refund/store-credit choice.
        const sizeReason = ctx.demoState.returnReason === "Too small" || ctx.demoState.returnReason === "Too big";
        if (sizeReason && it.apparel && it.sizeUp) ctx.goToStep("rt_exchange_offer");
        else ctx.goToStep("rt_refund_choice");
      }
    },

    /* ---- Bigger-size exchange offer (after label, data-driven on stock) ---- */
    rt_exchange_offer: {
      messages: [],
      onEnter: (ctx) => {
        const it = ctx.demoState.customer.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        // Non-apparel or no size-up defined → straight refund/credit choice.
        if (!it.apparel || !it.sizeUp) { ctx.goToStep("rt_refund_choice"); return; }
        const store = ctx.W.nearestInStock(it);
        const tooSmall = ctx.demoState.returnReason === "Too small";
        ctx.appendBubble({ role: "bot", text: tooSmall
          ? `Let's get you the right fit rather than just sending it back — would you like the same ${it.product} in a size ${it.sizeUp} instead of a refund?`
          : `Before you go — would you like the same ${it.product} in a different size (${it.sizeUp}) instead of a refund?` });
        if (store) {
          const others = it.stores.filter((s) => s.inStock && s !== store)
            .map((s) => `${s.name}, ${s.km}km`).join("; ");
          ctx.appendBubble({ role: "bot", text: `Good news: the size ${it.sizeUp} is in stock at ${store.name} — just ${store.km}km from your delivery address.${others ? ` (Also in stock at ${others}.)` : ""}` });
          ctx.renderQuickReplies([
            { label: `Pick up at ${store.name.replace(/^Myer /, "")}`, next: "rt_pickup" },
            { label: "Send it to me", next: "rt_send" },
            { label: "No, just refund", next: "rt_refund_choice" }
          ]);
        } else {
          ctx.appendBubble({ role: "bot", text: `The size ${it.sizeUp} isn't in any nearby store right now, but I can order it in and post it to you. Otherwise I'll sort your refund.` });
          ctx.renderQuickReplies([
            { label: "Order it in & post to me", next: "rt_send" },
            { label: "No, just refund", next: "rt_refund_choice" }
          ]);
        }
      }
    },
    rt_pickup: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const it = c.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        const store = ctx.W.nearestInStock(it) || { name: "Myer Chadstone" };
        ctx.appendBubble({ role: "bot", text: `Done! Your size ${it.sizeUp} is reserved at ${store.name} — collection desk, Level 2. Bring the size ${it.size} when you collect and we'll swap it on the spot. No postage either way. I've sent the collection details to your email and phone. ✅` });
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: `Your ${store.name} click & collect`, body: `Size ${it.sizeUp} of the ${it.product} reserved at ${store.name} (collection desk, Level 2). Bring your size ${it.size} to swap on the spot.` });
        ctx.fireSms({ to: ctx.maskM(c.mobile), body: `Myer: size ${it.sizeUp} reserved at ${store.name.replace(/^Myer /, "")}, Level 2. Bring your size ${it.size} to swap. Details emailed.` });
        ctx.recordOutcome("resolved");
        ctx.renderCrossSell([
          { brand: "SEED HERITAGE", title: "Leather Ankle Boot", img: "https://content-us-5.content-cms.com/af9094ac-4ec2-4ea9-8480-e7ef2c8369de/dxresources/6618/6618ba15-8068-4b0b-8681-31ca7e11cb28.jpg?output-format=webp" },
          { brand: "TRENERY", title: "Wool Scarf", img: "https://content-us-5.content-cms.com/af9094ac-4ec2-4ea9-8480-e7ef2c8369de/dxresources/c743/c7436019-9f7f-405c-915e-a6c6b9a43b36.jpg?output-format=webp" }
        ]);
        ctx.renderQuickReplies([{ label: "Perfect, thanks", next: "wc_bye" }]);
      }
    },
    rt_send: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const it = c.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        const faulty = ctx.demoState.returnReason === "Faulty";
        if (faulty) {
          ctx.appendBubble({ role: "bot", text: `Done! A brand-new ${it.product} (size ${it.size}) is on its way out to you, and your free prepaid return label for the faulty one is on its way to your email and phone. ✅` });
          ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer replacement", body: `Replacement ${it.product} (size ${it.size}) on its way; free prepaid return label for the faulty item attached.` });
          ctx.fireSms({ to: ctx.maskM(c.mobile), body: `Myer: a replacement ${it.product} is on its way; free prepaid return label sent. No postage.` });
        } else {
          ctx.appendBubble({ role: "bot", text: `Done! I'll post the size ${it.sizeUp} out to you, and your prepaid return label for the size ${it.size} is on its way to your email and phone. No postage either way. ✅` });
          ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer exchange", body: `Size ${it.sizeUp} of the ${it.product} on its way to you; prepaid return label for size ${it.size} attached. No postage.` });
          ctx.fireSms({ to: ctx.maskM(c.mobile), body: `Myer: size ${it.sizeUp} is on its way; prepaid return label for size ${it.size} sent. No postage either way.` });
        }
        ctx.recordOutcome("resolved");
        ctx.renderQuickReplies([{ label: "Thanks", next: "wc_bye" }]);
      }
    },
    /* ---- Refund vs store credit (retention: instant credit + bonus) ----
       refundAmount / refundLabel are set by whichever step routes here
       (single item, whole order, or exchange-declined). ------------------ */
    rt_refund_choice_setup: {
      messages: [],
      onEnter: (ctx) => {
        const it = ctx.demoState.customer.orders[ctx.demoState.orderIndex].items[ctx.demoState.returnIndex];
        ctx.demoState.refundAmount = it.price;
        ctx.demoState.refundLabel = it.product;
      },
      dynamicNext: () => "rt_refund_choice"
    },
    rt_refund_choice: {
      messages: [],
      onEnter: (ctx) => {
        const amt = ctx.demoState.refundAmount || 0;
        const credit = amt * 1.1;
        ctx.appendBubble({ role: "bot", text: "How would you like your money back?" });
        ctx.appendBubble({ role: "bot", text: `• Store credit — instant once scanned, and I'll add a 10% bonus, so $${credit.toFixed(2)}.\n• Original payment — $${amt.toFixed(2)} back to your card in 3–5 business days.` });
        ctx.renderQuickReplies([
          { label: `Store credit +10% ($${credit.toFixed(2)})`, next: "rt_credit" },
          { label: "Refund to my card", next: "rt_refund_card" }
        ]);
      }
    },
    rt_credit: {
      messages: [],
      onEnter: (ctx) => {
        const c = ctx.demoState.customer;
        const amt = ctx.demoState.refundAmount || 0;
        const credit = amt * 1.1;
        ctx.appendBubble({ role: "bot", text: `Lovely — $${credit.toFixed(2)} in store credit (including your 10% bonus) lands the moment your ${ctx.demoState.refundLabel} is scanned. It's ready to use online and in store. 💳` });
        ctx.fireEmail({ to: ctx.maskE(c.email), subject: "Your Myer store credit", body: `Store credit of $${credit.toFixed(2)} (incl. 10% bonus) for your ${ctx.demoState.refundLabel} return. Applied on scan.` });
        ctx.recordOutcome("resolved");
        ctx.renderQuickReplies([{ label: "Perfect, thanks", next: "wc_bye" }]);
      }
    },
    rt_refund_card: {
      messages: [],
      onEnter: (ctx) => {
        const amt = ctx.demoState.refundAmount || 0;
        ctx.appendBubble({ role: "bot", text: `No problem — we'll refund $${amt.toFixed(2)} to your original payment in 3–5 business days once your ${ctx.demoState.refundLabel} is scanned. Thanks for shopping with Myer! 💙` });
        ctx.recordOutcome("resolved");
        ctx.renderQuickReplies([{ label: "That's all, thanks", next: "wc_bye" }]);
      }
    },

    /* ---- Order picker (chip-driven; sets the active order, then verifies) ---- */
    wc_pick_order: {
      messages: [{ type: "text", text: "Sure — which order is it? (Pick one for the demo.)" }],
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
        { type: "text", text: "Thanks! Just so I know it's really you — what's the email and mobile on the order?" },
        { type: "note", text: "3-point verification — fit for order, returns and tracking. Account changes would step up to MFA." }
      ],
      onEnter: (ctx) => {
        const o = ctx.demoState.order;
        if (!o) { ctx.goToStep("sc_A4"); return; }
        // Demo: accept whatever they enter and proceed.
        ctx.awaitInput("verify", () => {
          ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. I've got your order up. ✅" });
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
        ctx.appendBubble({ role: "bot", text: "Perfect, that checks out. I've got your order up. ✅" });
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
        { type: "text", text: "You've got 30 days to return most items for a refund or exchange — they just need to be unworn with tags and proof of purchase. Faulty or damaged items can be returned any time, and we cover the postage. Beauty, earrings and a few other items have hygiene exclusions." }
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
        { type: "text", text: "MYER one is our free rewards program — you earn 2 Credits per $1 on eligible purchases, and every 2,000 Credits becomes a $10 Rewards Card. Members also get bonus-Credit events, birthday treats and exclusive offers." }
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
    },
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
    wc_done: {
      messages: [{ type: "text", text: "Happy to help. Is there anything else I can do for you today?" }],
      quickReplies: [{ label: "Track another order", next: "wc_welcome" }, { label: "No, thanks", next: "wc_bye" }]
    },
    wc_bye: {
      messages: [{ type: "text", text: "Thanks for shopping with Myer. Have a lovely day! 💙" }],
      quickReplies: [{ label: "Start again", next: "wc_welcome" }]
    }
  };
  return { entryStepId, steps };
})();
