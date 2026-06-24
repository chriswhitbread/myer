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
