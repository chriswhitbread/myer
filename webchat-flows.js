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
