// ========== Daily tips ==========
const tips = [
  "Be gentle with yourself today.",
  "It’s okay to not be okay.",
  "You are doing your best and that’s enough.",
  "One step at a time. You've got this.",
  "Your feelings are valid.",
];
const tipEl = document.getElementById("dailyTip");
if (tipEl) tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];

// (Removed the auto-insert heading code)

// ========== Chat helpers ==========
let chatEl = document.getElementById("chatbox");
if (!chatEl) {
  chatEl = document.createElement("div");
  chatEl.id = "chatbox";
  chatEl.style.cssText =
    "max-height:420px; overflow:auto; padding:12px; border:1px solid #eee; border-radius:8px; background:#fff; margin-top:8px;";
  document.body.appendChild(chatEl);
}

function scrollChat() { if (chatEl) chatEl.scrollTop = chatEl.scrollHeight; }

function addMessage(text, isUser = false) {
  if (!chatEl) return;
  const msg = document.createElement("div");
  msg.className = isUser ? "user-message" : "bot-message";
  msg.setAttribute("role", "text");
  msg.textContent = text;
  chatEl.appendChild(msg);
  scrollChat();
}

function addButtons(labels, handler) {
  if (!chatEl) return;
  const choiceDiv = document.createElement("div");
  choiceDiv.className = "choice-buttons";
  choiceDiv.setAttribute("role", "group");
  choiceDiv.setAttribute("aria-label", "Choices");

  labels.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.onclick = () => { handler(label.toLowerCase()); choiceDiv.remove(); };
    if (i === 0) setTimeout(() => btn.focus(), 0);
    choiceDiv.appendChild(btn);
  });

  chatEl.appendChild(choiceDiv);
  scrollChat();
}

// ========== Keywords & small state ==========
const RISK_REGEX = /\b(depress(?:ed|ion)?|frustrated|sick|suicid(?:e|al)?|sucide)\b/i;

let lastFlow = null;                // 'sit' | 'talk' | null
let postSitAwaitingMessage = false; // after Sit-with-it -> Continue
let awaitingTalkResponse = false;   // after "Talk about it"
let autoEndTimer = null;            // numeric timer handle
let activeCountdownCancel = null;   // cancels the visible countdown row

function clearAutoEndTimer() {
  if (autoEndTimer) { clearInterval(autoEndTimer); autoEndTimer = null; }
  if (typeof activeCountdownCancel === "function") {
    activeCountdownCancel();        // remove the row & prevent its onDone
    activeCountdownCancel = null;
  }
}

// ========== Feelings / routing ==========
function handleFeeling(feeling) {
  const input = document.getElementById("userInput");
  if (input) input.value = "";
  addMessage("I feel " + feeling, true);
  replyToFeeling(String(feeling || "").toLowerCase());
}

function sendMessage() {
  const input = document.getElementById("userInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // any user input cancels / pauses the auto-end
  clearAutoEndTimer();

  addMessage(text, true);
  input.value = "";

  const t = text.toLowerCase();

  // Free-typing phases (after sit-continue or talk prompt)
  if (postSitAwaitingMessage || awaitingTalkResponse) {
    handleSupportDetection(t);
    return;
  }

  const feelMatch = t.match(/\b(anxious|sad|angry|numb|overwhelmed)\b/);
  if (feelMatch) {
    replyToFeeling(feelMatch[1]);
  } else if (/(?:\b|_)(breath|breathe|4-4-4|box|exercise)(?:\b|_)/.test(t)) {
    startBreathingFlow();
  } else if (/\bcontinue\b/.test(t)) {
    handleChoice("continue");
  } else if (/\bend\b/.test(t)) {
    handleChoice("end");
  } else {
    handleChoice(t);
  }
}

// Allow pressing Enter to send
(() => {
  const input = document.getElementById("userInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
})();

function replyToFeeling(feeling) {
  const base = feeling.includes("sad")
    ? "I’m sorry to hear that. I’m here to support you. Would you like to talk about what’s making you feel this, or take a moment to breathe together?"
    : "That sounds really tough. I'm here to support you. Would you like to talk about what's making you feel this, or take a moment to breathe together?";
  addMessage(base);
  addChoices();
}

function addChoices() {
  addButtons(["Talk about it", "Take a breathing exercise", "Just sit with it"], handleChoice);
}

function addEndOptions() {
  addButtons(["Continue", "End chat"], handleChoice);
}

function continueChat() {
  addMessage("Okay. Would you like to talk about it, take a short breathing exercise, or just sit with it a little longer?");
  addChoices();
  addEndOptions();
}

function handleChoice(choice) {
  const c = String(choice || "").toLowerCase();

  if (c.includes("talk")) {
    lastFlow = "talk";
    awaitingTalkResponse = true;
    addMessage("Go ahead, I’m listening. What’s been going on today?");
    addEndOptions();
  } else if (c.includes("breathing")) {
    startBreathingFlow();
  } else if (c.includes("sit")) {
    startSitWithIt();
  } else if (c.includes("continue")) {
    if (lastFlow === "sit") {
      postSitAwaitingMessage = true;
      addMessage("I'm here. What would you like to share?");
      // no menu here — free typing
    } else {
      continueChat();
    }
  } else if (c.includes("end")) {
    addMessage("Thank you for sharing this space with me today. Take care. 🌿");
  } else {
    addMessage("Got it. Would you like a brief 4-4-4 breathing exercise, talk a bit more, or just sit with it?");
    addChoices();
    addEndOptions();
  }
}

// ========== Sit-with-it (10s countdown) ==========
function startSitWithIt() {
  lastFlow = "sit";
  addMessage("Let’s just sit with it for a few seconds. No fixing, just noticing.");
  makeCountdownRow({
    label: "Sitting…",
    seconds: 10,
    onDone: () => {
      addMessage("Thanks for sitting with it. Would you like to continue or end the chat?");
      addEndOptions();
    },
  });
}

// ========== Breathing (4-4-4 with rounds + pause/resume/stop) ==========
let breatherMounted = false;

function startBreathingFlow() {
  addMessage("Let's try a guided 4-4-4 breath: Inhale 4, hold 4, exhale 4. We’ll go together.");
  renderBreathingPanel();
}

function renderBreathingPanel() {
  if (breatherMounted) return;
  const panel = document.createElement("div");
  panel.className = "breather";
  panel.style.cssText =
    "background:#e6e6fa;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:10px;margin:8px 0;";
  panel.innerHTML = `
    <div class="breather-row" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div>
        <div class="breather-title" style="font-weight:600">Guided 4-4-4 Breathing</div>
        <div class="breather-sub" style="font-size:13px;opacity:.85">
          In 4s • Hold 4s • Out 4s • Rounds:
          <input id="bRounds" type="number" min="1" max="20" value="5"
                 style="width:56px;padding:4px 6px;border:1px solid #ddd;border-radius:6px">
        </div>
      </div>
      <div class="b-controls">
        <button id="bStart" type="button">Start</button>
        <button id="bPause" type="button" disabled>Pause</button>
        <button id="bStop"  type="button" disabled>Stop</button>
      </div>
    </div>
    <div class="b-visual" style="display:flex;justify-content:center;align-items:center;margin:8px 0">
      <div class="b-circle" id="bCircle"
           style="width:110px;height:110px;border-radius:999px;border:2px solid rgba(0,0,0,0.15);
                  display:flex;align-items:center;justify-content:center;position:relative;transition:transform .25s ease;background:#fff;">
        <span class="b-count" id="bCount" style="font-size:26px;font-weight:700">4</span>
        <div class="b-phase" id="bPhase" style="position:absolute;bottom:-20px;font-size:12px;opacity:.7">Ready</div>
      </div>
    </div>
    <div class="b-progress" style="height:6px;border-radius:6px;background:#f1f1f1;overflow:hidden">
      <div class="b-bar" id="bBar" style="height:100%;width:0%;background:#d6eaf8"></div>
    </div>
  `;
  chatEl.appendChild(panel);
  breatherMounted = true;
  scrollChat();

  // breathing completion goes to a 30s wrap-up with choices
  setupBreather(panel, () => {
    postBreathingWrapUp();
  });
}

function setupBreather(root, onComplete) {
  const bRounds = root.querySelector("#bRounds");
  const bStart  = root.querySelector("#bStart");
  const bPause  = root.querySelector("#bPause");
  const bStop   = root.querySelector("#bStop");
  const bCount  = root.querySelector("#bCount");
  const bPhase  = root.querySelector("#bPhase");
  const bBar    = root.querySelector("#bBar");
  const bCircle = root.querySelector("#bCircle");

  const mediaPrefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const breath = { timer:null, phase:"ready", remaining:0, round:0, totalRounds:5, paused:false };

  function setPhase(name, seconds){
    if (breath.timer) clearInterval(breath.timer);
    breath.phase = name;
    breath.remaining = seconds;
    bPhase.textContent = name[0].toUpperCase() + name.slice(1);
    tick();
    breath.timer = setInterval(tick, 1000);
  }

  function tick(){
    bCount.textContent = String(breath.remaining);
    const index = ["inhale","hold","exhale","sit"].indexOf(breath.phase);
    const progress = ((breath.round + (index >= 0 ? (index + 1) / 4 : 0)) / breath.totalRounds) * 100;
    bBar.style.width = Math.min(100, progress) + "%";
    if (!mediaPrefersReducedMotion) {
      bCircle.style.transform = (breath.phase === "inhale" || breath.phase === "hold") ? "scale(1.12)" : "scale(1.0)";
    }
    if (breath.remaining <= 0) { clearInterval(breath.timer); advance(); }
    else { breath.remaining -= 1; }
  }

  function advance(){
    if (breath.phase === "ready" || breath.phase === "sit") {
      if (breath.phase === "sit") breath.round++;
      if (breath.round >= breath.totalRounds) { finish(); return; }
      setPhase("inhale", 4); return;
    }
    if (breath.phase === "inhale") { setPhase("hold", 4); return; }
    if (breath.phase === "hold")   { setPhase("exhale", 4); return; }
    if (breath.phase === "exhale") { setPhase("sit", 2); return; }
  }

  function finish(){
    bPhase.textContent = "Complete";
    bCount.textContent = "✓";
    bPause.disabled = true; bStop.disabled = true; bStart.disabled = false;
    if (typeof onComplete === "function") setTimeout(onComplete, 600);
  }

  bStart.onclick = () => {
    breath.totalRounds = Math.max(1, Math.min(20, Number(bRounds.value) || 5));
    breath.round = 0; bBar.style.width = "0%";
    bPause.textContent = "Pause";
    bStart.disabled = true; bPause.disabled = false; bStop.disabled = false; breath.paused = false;
    setPhase("inhale", 4);
  };
  bPause.onclick = () => {
    if (!breath.timer && !breath.paused) return;
    if (!breath.paused) {
      clearInterval(breath.timer);
      breath.paused = true;
      bPause.textContent = "Resume";
      bPhase.textContent = "Paused";
    } else {
      breath.paused = false;
      bPause.textContent = "Pause";
      breath.timer = setInterval(tick, 1000);
    }
  };
  bStop.onclick = () => {
    if (breath.timer) clearInterval(breath.timer);
    breath.timer = null;
    bPhase.textContent = "Stopped"; bCount.textContent = "—";
    bPause.disabled = true; bStop.disabled = true; bStart.disabled = false;
  };
}

// ========== NEW: post-breathing wrap-up ==========
function postBreathingWrapUp() {
  addMessage("Nice work. Notice one small word for how you feel now.");
  addMessage("If you'd like, we can do another short round. Otherwise, the chat will end in 30 seconds.");
  startBreathingDecisionCountdown(30);
}

function startBreathingDecisionCountdown(seconds = 30) {
  // choices specific to breathing end
  addButtons(["Breathe again", "End chat"], (choice) => {
    if (choice.includes("breathe")) {
      clearAutoEndTimer();  // pause/cancel countdown
      startBreathingFlow(); // restart breathing session
    } else {
      clearAutoEndTimer();
      addMessage("Thank you for today and for checking in. Take care. 🌿");
    }
  });

  // visible countdown + cancel handle
  activeCountdownCancel = makeCountdownRow({
    label: "Chat will end automatically",
    seconds,
    onDone: () => {
      addMessage("Chat ended. If you’d like to breathe again or talk later, I’m here when you return. 🌿");
      activeCountdownCancel = null;
    }
  });

  // numeric guard (also canceled on input/button)
  let n = seconds;
  autoEndTimer = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearAutoEndTimer();
    }
  }, 1000);
}

// ========== Support detection & 30s auto-end ==========
function handleSupportDetection(lowerText) {
  // we’re in a free-typing phase after "sit-continue" or "talk"
  postSitAwaitingMessage = false;
  awaitingTalkResponse = false;

  if (RISK_REGEX.test(lowerText)) {
    addMessage("Thank you for sharing that. Would you like to reach out to a therapist or talk to someone right now? I can suggest support options.");
    recommendSupport();
    startEndCountdown(30);
  } else {
    addMessage("Thank you for sharing. You’re not alone, and I’m glad you told me.");
    addMessage("If at any point you’d like more support, I can recommend someone to talk to as well.");
    startEndCountdown(30);
  }
}

function recommendSupport() {
  // Mind, NHS 111, and 911 only
  addMessage(
    "Support you can reach out to:\n" +
    "• Mind: mind.org.uk — mental health information and support\n" +
    "• NHS: Call 111 for urgent medical help or advice\n" +
    "• Emergency: Call 911 if you or someone else is in immediate danger"
  );
}

function startEndCountdown(seconds = 30) {
  // control buttons for general wrap-up
  addButtons(["Continue chat", "End now"], (choice) => {
    if (choice.includes("continue")) {
      clearAutoEndTimer(); // pause/stop both the numeric and visual countdown
      addMessage("Okay, I’m here. What would you like to share next?");
      awaitingTalkResponse = true;  // free typing resumes
      lastFlow = "talk";
    } else {
      clearAutoEndTimer();
      addMessage("Thank you for sharing this space with me today. Take care. 🌿");
    }
  });

  // start visible countdown and keep a cancel handle
  activeCountdownCancel = makeCountdownRow({
    label: "Chat will end automatically",
    seconds,
    onDone: () => {
      addMessage("Chat ended. If you’d like to talk again, I’m here whenever you return. 🌿");
      activeCountdownCancel = null;
    }
  });

  // background numeric guard (also canceled on input/continue)
  let n = seconds;
  autoEndTimer = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearAutoEndTimer();
    }
  }, 1000);
}

// ========== Small countdown helper (for “sit with it” and auto-end bar) ==========
function makeCountdownRow({label, seconds=10, onDone}){
  if (!chatEl) return () => {};
  const box = document.createElement("div");
  box.className = "breather";
  box.style.cssText =
    "background:#e6e6fa;border:1px solid rgba(0,0,0,0.06);border-radius:8px;padding:10px;margin:8px 0;";
  box.innerHTML = `
    <div class="breather-row" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div class="breather-title" style="font-weight:600">${label}</div>
      <div class="b-controls"><span class="countdownVal" aria-live="polite">${seconds}s</span></div>
    </div>`;
  chatEl.appendChild(box);
  scrollChat();

  let n = seconds;
  let cancelled = false;
  const span = box.querySelector(".countdownVal");

  const t = setInterval(() => {
    if (cancelled) { clearInterval(t); return; }
    n -= 1; span.textContent = n + "s";
    if (n <= 0) {
      clearInterval(t);
      if (!cancelled && typeof onDone === "function") onDone();
    }
  }, 1000);

  // return a cancel function so callers can stop + remove the row
  return function cancelCountdown(){
    cancelled = true;
    clearInterval(t);
    if (box && box.parentNode) box.parentNode.removeChild(box);
  };
}
