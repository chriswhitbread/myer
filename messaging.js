/* Myer Concierge messaging widget */
(function () {
  const C = window.MyerConversations;
  const WF = window.MyerWebchatFlows || { steps: {}, entryStepId: null };
  function getStep(id) { return (WF.steps && WF.steps[id]) || C.steps[id]; }
  const root = document.getElementById("myer-messaging-root");

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

  root.innerHTML = `
    <button class="mw-launcher" id="mw-launcher" aria-label="Open Myer Concierge" title="Myer Concierge">
      <span class="mw-launcher__circle">
        <svg class="mw-launcher__icon" width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g opacity="0.7"><path opacity="0.9" d="M26.25 11.3148H24.375V16.0023C24.375 18.5908 22.2759 20.6898 19.6875 20.6898H11.25V22.5648C11.25 24.6358 12.9291 26.3148 15 26.3148H20.625L24.7125 29.7179C25.11 30.0489 25.7016 29.9954 26.0325 29.5979C26.1731 29.4292 26.25 29.2164 26.25 28.9961V26.3148C28.3209 26.3148 30 24.6358 30 22.5648V15.0648C30 12.9939 28.3209 11.3148 26.25 11.3148Z" fill="white"/></g><path d="M18.75 0.0648193H3.75C1.67906 0.0648193 0 1.74388 0 3.81482V15.0648C0 17.1358 1.67906 18.8148 3.75 18.8148V22.4054C3.75 22.9229 4.17 23.3429 4.6875 23.3429C4.91063 23.3429 5.12719 23.2633 5.29688 23.1179L10.3125 18.8148H18.75C20.8209 18.8148 22.5 17.1358 22.5 15.0648V3.81482C22.5 1.74388 20.8209 0.0648193 18.75 0.0648193Z" fill="white"/></svg>
      </span>
    </button>
    <section class="mw-window" id="mw-window" aria-hidden="true">
      <header class="mw-header">
        <div class="mw-header__id">
          <div class="mw-header__title">Myer Concierge</div>
        </div>
        <div class="mw-header__actions">
          <button class="mw-iconbtn" id="mw-reset" title="Restart demo" aria-label="Restart">↻</button>
          <button class="mw-iconbtn mw-iconbtn--chevron" id="mw-close" title="Minimise" aria-label="Minimise">⌄</button>
        </div>
      </header>
      <div class="mw-messages" id="mw-messages"></div>
      <form class="mw-composer" id="mw-composer">
        <input class="mw-composer__input" id="mw-input" type="text" placeholder="Type here..." autocomplete="off" />
        <button class="mw-composer__send" type="submit" aria-label="Send">&#9658;</button>
      </form>
    </section>
  `;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function safeColor(c) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(c)) ? String(c) : "transparent";
  }

  const launcher = document.getElementById("mw-launcher");
  const win = document.getElementById("mw-window");

  let started = false;
  function open() {
    win.classList.add("mw-window--open"); win.setAttribute("aria-hidden", "false"); launcher.classList.add("mw-launcher--hidden");
    if (!started) { started = true; goToStep((window.MyerWebchatFlows && window.MyerWebchatFlows.entryStepId) || C.welcomeStepId); }
  }
  function close() { win.classList.remove("mw-window--open"); win.setAttribute("aria-hidden", "true"); launcher.classList.remove("mw-launcher--hidden"); }
  function toggle() { win.classList.contains("mw-window--open") ? close() : open(); }

  launcher.addEventListener("click", open);
  const calloutBtn = document.getElementById("mw-callout-btn");
  if (calloutBtn) calloutBtn.addEventListener("click", () => { if (window.MyerDemoUI) window.MyerDemoUI.callout(); });
  document.getElementById("mw-close").addEventListener("click", close);

  const messagesEl = document.getElementById("mw-messages");
  let currentSpeaker = "bot";
  let currentAgentName = null;

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  // ---- Demo UI: simulated iPhone (2FA), Mail app, deflection counter, badges, cross-sell, callout ----
  (function setupDemoUI() {
    // iPhone mock-up: a lock screen (notifications) and an in-phone Mail app.
    // Tapping a Mail notification opens the Mail app *inside* the phone.
    const phone = document.createElement("div"); phone.id = "mw-phone"; phone.className = "mw-phone";
    phone.innerHTML = `
      <div class="mw-phone__screen">
        <div class="mw-phone__statusbar"><span>9:41</span><span class="mw-phone__sig">5G &nbsp;&#9737;</span></div>
        <div class="mw-phone__lock" id="mw-phone-lock">
          <div class="mw-phone__time">9:41</div>
          <div class="mw-phone__date">Today</div>
          <div class="mw-phone__notifs" id="mw-phone-notifs"></div>
        </div>
        <div class="mw-phone__mail" id="mw-phone-mail">
          <div class="mw-mail__bar"><button class="mw-mail__back" id="mw-mail-back">&#8249; Inbox</button><span class="mw-mail__appname">Mail</span></div>
          <div class="mw-mail__list" id="mw-mail-list"></div>
        </div>
      </div>
      <div class="mw-phone__bar"></div>`;

    const counter = document.createElement("div"); counter.id = "mw-counter"; counter.className = "mw-counter";
    counter.textContent = "0 of 0 enquiries resolved without an agent";
    document.body.appendChild(phone); document.body.appendChild(counter);

    // Open / close the in-phone Mail app.
    function openMailApp() { phone.classList.add("mw-phone--mailopen"); }
    function closeMailApp() { phone.classList.remove("mw-phone--mailopen"); }
    phone.addEventListener("click", (e) => {
      if (e.target.closest("#mw-mail-back")) { closeMailApp(); return; }
      // Tapping a Mail notification opens the Mail app.
      const notif = e.target.closest(".mw-phone__notif--mail");
      if (notif) openMailApp();
    });

    // Push a notification onto the iPhone lock screen (Messages or Mail).
    function pushPhoneNotif(kind, appHtml, title, body) {
      phone.classList.add("mw-phone--show");
      const notifs = document.getElementById("mw-phone-notifs");
      notifs.querySelectorAll(".mw-phone__notif").forEach((n) => n.classList.remove("is-new"));
      const n = document.createElement("div");
      n.className = "mw-phone__notif is-new" + (kind === "mail" ? " mw-phone__notif--mail" : "");
      const hint = kind === "mail" ? `<div class="mw-phone__notif-hint">Tap to open in Mail</div>` : "";
      n.innerHTML = `<div class="mw-phone__notif-head"><span class="mw-phone__notif-app">${appHtml}</span><span class="mw-phone__notif-when">now</span></div><div class="mw-phone__notif-from">${esc(title)}</div><div class="mw-phone__notif-body">${esc(body)}</div>${hint}`;
      notifs.prepend(n);
    }

    window.MyerDemoUI = {
      email(msg) {
        // 1) Add the email to the in-phone Mail app inbox (newest on top).
        const list = document.getElementById("mw-mail-list");
        list.querySelectorAll(".mw-mail__item").forEach((n) => n.classList.remove("is-new"));
        const item = document.createElement("div"); item.className = "mw-mail__item is-new";
        // Optional PDF attachment (e.g. the prepaid return label).
        const attach = msg.attachment ? `<div class="mw-attach">
            <div class="mw-attach__icon"><span class="mw-attach__fold"></span><span class="mw-attach__tag">PDF</span></div>
            <div class="mw-attach__meta"><div class="mw-attach__name">${esc(msg.attachment.name)}</div><div class="mw-attach__size">${esc(msg.attachment.size)}</div></div>
          </div>` : "";
        item.innerHTML = `<div class="mw-mail__row"><span class="mw-mail__sender">Myer</span><span class="mw-mail__when">now</span></div><div class="mw-mail__subj">${esc(msg.subject)}</div><div class="mw-mail__to">to ${esc(msg.to)}</div><div class="mw-mail__snippet">${esc(msg.body)}</div>${attach}`;
        list.prepend(item);
        // 2) Show a tappable Mail notification on the lock screen.
        pushPhoneNotif("mail", `&#9993;&#65039; MAIL`, "Myer", msg.subject);
      },
      sms(msg) {
        // iPhone lock-screen receives a Messages notification with the code.
        pushPhoneNotif("sms", `&#128172; MESSAGES`, "MYER", msg.body);
      },
      badge(kind) {
        const row = document.createElement("div"); row.className = "mw-row mw-row--bot";
        const label = kind === "resolved" ? "Resolved instantly" : "Routed to specialist";
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
        el.innerHTML = `<button class="mw-callout__x" aria-label="Close">✕</button><h4>One chat, not five systems</h4><p>This whole journey happened in a single Agentforce chat, replacing the current spread:</p><ul><li>Genesys / Oration</li><li>Freshdesk</li><li>BSP</li><li>ShipIT</li></ul>`;
        document.body.appendChild(el);
        el.querySelector(".mw-callout__x").addEventListener("click", () => el.remove());
      }
    };
  })();

  function appendBubble({ role, text }) {
    const wrap = document.createElement("div");
    wrap.className = "mw-row mw-row--" + role;
    const avatarText = role === "agent" ? (currentAgentName ? currentAgentName[0] : "S") : "M";
    const avatar = role === "customer" ? "" : `<div class="mw-avatar mw-avatar--${role}">${esc(avatarText)}</div>`;
    wrap.innerHTML = `${avatar}<div class="mw-bubble mw-bubble--${role}">${esc(text)}</div>`;
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
    const avatarText = currentSpeaker === "agent" ? (currentAgentName ? currentAgentName[0] : "S") : "M";
    el.innerHTML = `<div class="mw-avatar mw-avatar--${currentSpeaker}">${esc(avatarText)}</div><div class="mw-bubble mw-bubble--${currentSpeaker} mw-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }
  // Remove the specific indicator returned by showTyping(); avoids races between overlapping playbacks.
  function hideTyping(el) { if (el && el.parentNode) el.remove(); }

  // Tracks the chips currently offered to the user, so typed replies that match
  // a visible chip label can be routed the same way a click would be.
  let activeQuickReplies = [];
  function clearQuickReplies() {
    messagesEl.querySelectorAll(".mw-quickreplies").forEach((n) => n.remove());
    activeQuickReplies = [];
  }

  // Match typed text against a currently-rendered chip. Exact (case-insensitive)
  // match wins; otherwise a single unambiguous substring match. Returns null if
  // there's no match or the match is ambiguous, so the caller can fall through.
  function matchQuickReply(text) {
    if (!activeQuickReplies.length) return null;
    const t = text.trim().toLowerCase();
    if (!t) return null;
    const exact = activeQuickReplies.find((qr) => qr.label.trim().toLowerCase() === t);
    if (exact) return exact;
    const partial = activeQuickReplies.filter((qr) => {
      const l = qr.label.trim().toLowerCase();
      return l.includes(t) || t.includes(l);
    });
    return partial.length === 1 ? partial[0] : null;
  }

  // Shared chip-click behaviour. A quick reply may carry an optional `order`
  // (an order number); picking it sets the active order before navigating,
  // which lets the opening menu offer demo orders as clickable chips.
  function handleChip(qr) {
    clearQuickReplies();
    // Clicking a chip is an explicit choice, so drop any awaited typed input
    // so a step's onEnter awaitInput handler can't fire after navigating away.
    pendingInput = null;
    if (qr.label !== "(continue)") appendBubble({ role: "customer", text: qr.label });
    if (qr.order && window.MyerWebchat) {
      demoState.order = window.MyerWebchat.lookupOrder(qr.order) || null;
    }
    goToStep(qr.next);
  }

  function renderQuickReplies(replies) {
    if (!replies || !replies.length) return;
    activeQuickReplies = replies;
    const wrap = document.createElement("div");
    wrap.className = "mw-quickreplies";
    replies.forEach((qr) => {
      const btn = document.createElement("button");
      btn.className = "mw-chip";
      if (qr.desc) {
        // Two-line chip: bold-ish label on top, muted product summary beneath.
        btn.classList.add("mw-chip--detailed");
        const main = document.createElement("span"); main.className = "mw-chip__label"; main.textContent = qr.label;
        const sub = document.createElement("span"); sub.className = "mw-chip__desc"; sub.textContent = qr.desc;
        btn.appendChild(main); btn.appendChild(sub);
      } else {
        btn.textContent = qr.label;
      }
      btn.addEventListener("click", () => handleChip(qr));
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Show the typing indicator for a short, slightly-randomised beat (scaled to
  // message length), then render the bot bubble. Mirrors the Agentforce /
  // Salesforce messenger feel where the agent "types" before each reply.
  async function botSay(text) {
    const typingEl = showTyping();
    const base = 500;
    const perChar = Math.min((String(text).length || 0) * 14, 900);
    await sleep(base + perChar);
    hideTyping(typingEl);
    const bubble = appendBubble({ role: currentSpeaker, text });
    await sleep(140);
    return bubble;
  }

  // The welcome step renders as a single bordered "intro card" (greeting text +
  // option pills grouped together with the avatar), matching the real Myer Concierge.
  function renderIntroCard(step) {
    activeQuickReplies = step.quickReplies || [];
    const row = document.createElement("div");
    row.className = "mw-row mw-row--bot mw-intro-row";
    const card = document.createElement("div");
    card.className = "mw-intro-card";
    step.messages.forEach((msg) => {
      if (msg.type !== "text") return;
      const p = document.createElement("p");
      p.className = "mw-intro-card__text";
      p.textContent = msg.text;
      card.appendChild(p);
    });
    (step.quickReplies || []).forEach((qr) => {
      const btn = document.createElement("button");
      btn.className = "mw-chip mw-chip--intro";
      btn.textContent = qr.label;
      btn.addEventListener("click", () => { row.remove(); handleChip(qr); });
      card.appendChild(btn);
    });
    row.innerHTML = `<div class="mw-avatar mw-avatar--bot">M</div>`;
    row.appendChild(card);
    messagesEl.appendChild(row);
    scrollDown();
  }

  async function goToStep(stepId) {
    const step = getStep(stepId);
    if (!step) return;
    clearQuickReplies();
    if (step.speaker) currentSpeaker = step.speaker;
    if (step.agentName) currentAgentName = step.agentName;
    if (step.system) appendSystem(step.system);

    if (stepId === C.welcomeStepId || step.intro === true) {
      renderIntroCard(step);
      if (typeof step.onEnter === "function") {
        const _W = window.MyerWebchat || {};
        await step.onEnter({ demoState, goToStep, appendBubble, botSay, awaitInput, fireEmail, fireSms, recordOutcome,
          W: _W, maskE: _W.maskEmail, maskM: _W.maskMobile,
          renderQuickReplies, renderCrossSell, renderCard });
      }
      return;
    }

    for (const msg of step.messages) {
      const typingEl = showTyping();
      await sleep(650);
      hideTyping(typingEl);
      if (msg.type === "text") {
        appendBubble({ role: currentSpeaker, text: msg.text });
      } else if (msg.type === "note") {
        appendSystem(msg.text);
      } else if (msg.type === "card") {
        renderCard(msg.card);
      }
      await sleep(180);
    }
    if (typeof step.onEnter === "function") {
      const _W = window.MyerWebchat || {};
      await step.onEnter({ demoState, goToStep, appendBubble, botSay, awaitInput, fireEmail, fireSms, recordOutcome,
        W: _W, maskE: _W.maskEmail, maskM: _W.maskMobile,
        renderQuickReplies, renderCrossSell, renderCard });
    }
    if (typeof step.dynamicNext === "function") {
      const nx = step.dynamicNext({ demoState, W: window.MyerWebchat });
      if (nx) { goToStep(nx); return; }
    }
    renderQuickReplies(step.quickReplies);
  }

  function renderCard(card) {
    const wrap = document.createElement("div");
    wrap.className = "mw-row mw-row--" + currentSpeaker;
    let html = "";
    if (card.kind === "order") {
      const thumbStyle = card.img
        ? `background-image:url('${encodeURI(card.img)}');background-size:cover;background-position:center`
        : `background:${safeColor(card.thumb)}`;
      html = `<div class="mw-card">
        <div class="mw-card__order">
          <div class="mw-card__thumb" style="${thumbStyle}"></div>
          <div><div class="mw-card__title">${esc(card.item)}</div>
          <div class="mw-card__meta">Order ${esc(card.id)}</div>
          <div class="mw-card__price">${esc(card.price)}</div></div>
        </div></div>`;
    } else if (card.kind === "stock") {
      const rows = card.stores.map((s) => {
        const txt = s.status === "in" ? "In stock" : s.status === "low" ? "Low stock" : "Out of stock";
        return `<div class="mw-stock__row"><span><span class="mw-dot mw-dot--${esc(s.status)}"></span>${esc(s.name)}</span><span class="mw-stock__txt mw-stock__txt--${esc(s.status)}">${txt}</span></div>`;
      }).join("");
      html = `<div class="mw-card">
        <div class="mw-card__title">${esc(card.item)}</div>
        <div class="mw-card__online"><span class="mw-dot mw-dot--in"></span>${esc(card.online)}</div>
        <div class="mw-stock">${rows}</div></div>`;
    } else if (card.kind === "tracking") {
      const steps = card.steps.map((s) => `<div class="mw-track__step ${s.done ? "is-done" : ""}"><span class="mw-track__dot"></span>${esc(s.label)}</div>`).join("");
      html = `<div class="mw-card">
        <div class="mw-card__meta">Estimated delivery</div>
        <div class="mw-card__title">${esc(card.eta)}</div>
        <div class="mw-track">${steps}</div></div>`;
    } else if (card.kind === "rewards") {
      html = `<div class="mw-card mw-card--rewards">
        <div class="mw-card__meta">MYER one · ${esc(card.tier)}</div>
        <div class="mw-rewards"><div><div class="mw-rewards__num">${esc(card.points)}</div><div class="mw-rewards__lbl">points</div></div>
        <div><div class="mw-rewards__num">${esc(card.credit)}</div><div class="mw-rewards__lbl">credit</div></div></div></div>`;
    }
    wrap.innerHTML = html;
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  function renderCrossSell(items) {
    if (window.MyerDemoUI && window.MyerDemoUI.crossSell) window.MyerDemoUI.crossSell(items);
  }

  const composer = document.getElementById("mw-composer");
  const input = document.getElementById("mw-input");
  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    // Capture any chip the typed text matches BEFORE clearQuickReplies wipes them.
    const chipMatch = pendingInput ? null : matchQuickReply(text);
    clearQuickReplies();
    appendBubble({ role: "customer", text });
    if (pendingInput) {
      const handler = pendingInput; pendingInput = null;
      handler.onValue(text);
      return;
    }
    // A typed reply that matches a visible chip is routed like a click, but
    // without re-echoing the chip label, since we've already shown what they typed.
    if (chipMatch) {
      if (chipMatch.order && window.MyerWebchat) {
        demoState.order = window.MyerWebchat.lookupOrder(chipMatch.order) || demoState.order;
      }
      goToStep(chipMatch.next);
      return;
    }
    const stepId = C.matchKeyword(text);
    if (stepId) {
      goToStep(stepId);
    } else {
      const fbTyping = showTyping();
      setTimeout(() => {
        hideTyping(fbTyping);
        appendBubble({ role: "bot", text: "I can help with deliveries, returns, stock checks, MYER one rewards, or connect you to a person. What would you like to do?" });
        renderQuickReplies(getStep(WF.entryStepId || C.welcomeStepId).quickReplies || C.steps.welcome.quickReplies);
      }, 650);
    }
  });

  function reset() {
    messagesEl.innerHTML = "";
    resetSpeaker();
    demoState.order = null; demoState.lineItem = null;
    // Clear the simulated phone so a restart starts from a clean slate.
    const phoneNotifs = document.getElementById("mw-phone-notifs");
    const mailList = document.getElementById("mw-mail-list");
    if (phoneNotifs) phoneNotifs.innerHTML = "";
    if (mailList) mailList.innerHTML = "";
    const phoneEl = document.getElementById("mw-phone");
    if (phoneEl) phoneEl.classList.remove("mw-phone--show", "mw-phone--mailopen");
    goToStep((window.MyerWebchatFlows && window.MyerWebchatFlows.entryStepId) || C.welcomeStepId);
  }
  document.getElementById("mw-reset").addEventListener("click", reset);

  function resetSpeaker() { currentSpeaker = "bot"; currentAgentName = null; }

  window.MyerWidget = { open, close, toggle, reset, goToStep, resetSpeaker, _root: root, _C: C, demoState, awaitInput, fireEmail, fireSms, recordOutcome };
})();
