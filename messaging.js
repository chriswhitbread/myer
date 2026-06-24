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
