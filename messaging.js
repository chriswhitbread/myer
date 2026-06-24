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

  // reset/render wired in Tasks 8 & 10
  function reset() { /* replaced in Task 10 */ }

  function resetSpeaker() { currentSpeaker = "bot"; currentAgentName = null; }

  window.MyerWidget = { open, close, toggle, reset, goToStep, resetSpeaker, _root: root, _C: C };
})();
