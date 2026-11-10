/* Ask Sunaina: drop-in widget. Add before </body>:
   <script src="ask-sunaina.js" defer></script>
   Two modes: "Ask" (recruiter Q&A) and "Interview me" (answers as Sunaina in STAR style). */
(() => {
  const API_URL = "https://ask-sunainas-api.vercel.app/api/chat"; 
  const ACCENT = "#BB002F"; // 
  const EMAIL = "Sunainashaik01@gmail.com";

  const ASK_CHIPS = [
    "What did she build with Power Apps?",
    "Tell me about the Copilot PFMEA agent",
    "What’s her full-stack experience?",
    "Which tools does she know best?",
  ];
  const INTERVIEW_QS = [
    "Tell me about yourself.",
    "Describe a time you improved a process.",
    "Tell me about a technical challenge you solved.",
    "How do you use data to make decisions?",
    "Why quality engineering and software?",
  ];
  const INTRO = {
    ask: "Ask anything about Sunaina’s experience, skills, or projects. Answers come only from her portfolio content.",
    interview: "Pick a question, or type your own. You’ll get an answer as Sunaina might give it in an interview, drawn from her real experience.",
  };

  const css = `
  #as-root{--a:${ACCENT};position:fixed;right:18px;bottom:18px;z-index:9999;font:15px/1.5 system-ui,sans-serif;color:#e8ecef}
  #as-root *{box-sizing:border-box}
  #as-fab{background:var(--a);color:#06231b;border:0;border-radius:999px;padding:12px 20px;font:600 15px system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.35)}
  #as-fab:focus-visible,#as-root button:focus-visible,#as-in:focus-visible{outline:2px solid var(--a);outline-offset:2px}
  #as-panel{display:none;flex-direction:column;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 36px);background:#12171b;border:1px solid #2a343b;border-radius:14px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.5)}
  #as-root.open #as-panel{display:flex}#as-root.open #as-fab{display:none}
  #as-head{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #2a343b}
  #as-head b{flex:1;font-weight:600}
  .as-tab{background:none;border:1px solid #2a343b;color:#aab6bd;border-radius:8px;padding:5px 10px;font-size:13px;cursor:pointer}
  .as-tab[aria-selected=true]{background:var(--a);border-color:var(--a);color:#06231b;font-weight:600}
  #as-x{background:none;border:0;color:#aab6bd;font-size:20px;cursor:pointer;padding:0 4px}
  #as-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .as-msg{max-width:88%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
  .as-bot{background:#1b232a;align-self:flex-start;border-top-left-radius:4px}
  .as-me{background:var(--a);color:#06231b;align-self:flex-end;border-top-right-radius:4px}
  .as-note{color:#8a979f;font-size:13px;align-self:stretch;max-width:100%;padding:0}
  .as-typing{opacity:.6}
  #as-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}
  #as-chips button{background:none;border:1px solid #34424b;color:#cfd8dd;border-radius:999px;padding:5px 10px;font-size:13px;cursor:pointer;text-align:left}
  #as-chips button:hover{border-color:var(--a);color:#fff}
  #as-form{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #2a343b}
  #as-in{flex:1;background:#0c1013;border:1px solid #2a343b;border-radius:8px;color:inherit;padding:8px 10px;font:inherit}
  #as-send{background:var(--a);color:#06231b;border:0;border-radius:8px;padding:0 14px;font-weight:600;cursor:pointer}
  #as-foot{font-size:11.5px;color:#7a868e;padding:0 12px 9px}
  @media(max-width:480px){#as-panel{height:calc(100vh - 24px);width:calc(100vw - 24px)}}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const root = document.createElement("div");
  root.id = "as-root";
  root.innerHTML = `
    <button id="as-fab" aria-label="Open chat with Sunaina’s AI assistant">Ask Sunaina</button>
    <section id="as-panel" role="dialog" aria-label="Ask Sunaina">
      <div id="as-head" role="tablist">
        <b>Ask Sunaina</b>
        <button class="as-tab" role="tab" data-mode="ask">Ask</button>
        <button class="as-tab" role="tab" data-mode="interview">Interview me</button>
        <button id="as-x" aria-label="Close chat">×</button>
      </div>
      <div id="as-log" aria-live="polite"></div>
      <div id="as-chips"></div>
      <form id="as-form">
        <input id="as-in" maxlength="300" placeholder="Type a question" aria-label="Your question" autocomplete="off">
        <button id="as-send" type="submit">Send</button>
      </form>
      <div id="as-foot">AI-generated from Sunaina’s portfolio. For anything important, email ${EMAIL}.</div>
    </section>`;
  document.body.append(root);

  const $ = (s) => root.querySelector(s);
  const log = $("#as-log"), chips = $("#as-chips"), input = $("#as-in");
  const hist = { ask: [], interview: [] };
  let mode = "ask", busy = false;

  function bubble(kind, text) {
    const d = document.createElement("div");
    d.className = "as-msg as-" + kind;
    d.textContent = text; // textContent keeps model output from injecting HTML
    log.append(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function renderMode() {
    root.querySelectorAll(".as-tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.mode === mode));
    log.replaceChildren();
    bubble("note", INTRO[mode]);
    hist[mode].forEach((m) => bubble(m.role === "user" ? "me" : "bot", m.content));
    chips.replaceChildren();
    (mode === "ask" ? ASK_CHIPS : INTERVIEW_QS).forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.onclick = () => send(q);
      chips.append(b);
    });
    input.placeholder = mode === "ask" ? "Ask about her work or skills" : "Ask an interview question";
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    input.value = "";
    hist[mode].push({ role: "user", content: text });
    bubble("me", text);
    const wait = bubble("bot", "Thinking…");
    wait.classList.add("as-typing");
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: hist[mode].slice(-7) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed");
      wait.textContent = data.reply;
      hist[mode].push({ role: "assistant", content: data.reply });
    } catch (e) {
      hist[mode].pop();
      wait.textContent = `I couldn’t get an answer just now. You can reach Sunaina directly at ${EMAIL}.`;
    }
    wait.classList.remove("as-typing");
    log.scrollTop = log.scrollHeight;
    busy = false;
  }

  $("#as-fab").onclick = () => { root.classList.add("open"); input.focus(); };
  $("#as-x").onclick = () => root.classList.remove("open");
  root.querySelectorAll(".as-tab").forEach((t) => (t.onclick = () => { mode = t.dataset.mode; renderMode(); }));
  $("#as-form").onsubmit = (e) => { e.preventDefault(); send(input.value); };
  document.addEventListener("keydown", (e) => e.key === "Escape" && root.classList.remove("open"));
  renderMode();
})();
