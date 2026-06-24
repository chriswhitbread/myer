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
    if (!started) { started = true; goToStep(C.welcomeStepId); }
  }
  function close() { win.classList.remove("mw-window--open"); win.setAttribute("aria-hidden", "true"); launcher.classList.remove("mw-launcher--hidden"); }
  function toggle() { win.classList.contains("mw-window--open") ? close() : open(); }

  launcher.addEventListener("click", open);
  document.getElementById("mw-close").addEventListener("click", close);

  const messagesEl = document.getElementById("mw-messages");
  let currentSpeaker = "bot";
  let currentAgentName = null;

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

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
    el.id = "mw-typing";
    const avatarText = currentSpeaker === "agent" ? (currentAgentName ? currentAgentName[0] : "S") : "M";
    el.innerHTML = `<div class="mw-avatar mw-avatar--${currentSpeaker}">${esc(avatarText)}</div><div class="mw-bubble mw-bubble--${currentSpeaker} mw-typing"><span></span><span></span><span></span></div>`;
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
        renderCard(msg.card);
      }
      await sleep(180);
    }
    renderQuickReplies(step.quickReplies);
  }

  function renderCard(card) {
    const wrap = document.createElement("div");
    wrap.className = "mw-row mw-row--" + currentSpeaker;
    let html = "";
    if (card.kind === "order") {
      html = `<div class="mw-card">
        <div class="mw-card__order">
          <div class="mw-card__thumb" style="background:${safeColor(card.thumb)}"></div>
          <div><div class="mw-card__title">${esc(card.item)}</div>
          <div class="mw-card__meta">Order ${esc(card.id)}</div>
          <div class="mw-card__price">${esc(card.price)}</div></div>
        </div></div>`;
    } else if (card.kind === "stock") {
      const rows = card.stores.map((s) => {
        const icon = s.status === "in" ? "✅" : s.status === "low" ? "⚠️" : "❌";
        const txt = s.status === "in" ? "In stock" : s.status === "low" ? "Low stock" : "Out of stock";
        return `<div class="mw-stock__row"><span>${icon} ${esc(s.name)}</span><span class="mw-stock__txt">${txt}</span></div>`;
      }).join("");
      html = `<div class="mw-card">
        <div class="mw-card__title">${esc(card.item)}</div>
        <div class="mw-card__online">🟢 ${esc(card.online)}</div>
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

  function reset() {
    messagesEl.innerHTML = "";
    resetSpeaker();
    goToStep(C.welcomeStepId);
  }
  document.getElementById("mw-reset").addEventListener("click", reset);

  function resetSpeaker() { currentSpeaker = "bot"; currentAgentName = null; }

  window.MyerWidget = { open, close, toggle, reset, goToStep, resetSpeaker, _root: root, _C: C };
})();
