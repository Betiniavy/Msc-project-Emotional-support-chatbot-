/* =====================================
   ELEMENT REFERENCES
===================================== */

const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const startBtn = document.getElementById("startBtn");
const entryScreen = document.getElementById("entryScreen");
const chatContainer = document.getElementById("chatContainer");

let currentNode = null;

/* =====================================
   SESSION TRACKING
===================================== */

let sessionData = {
  visitedNodes: [],
  interventionsUsed: new Set(),
};

/* =====================================
   RISK DETECTION
===================================== */

const HIGH_RISK = /\b(suicid(?:e|al)?|kill myself|end my life)\b/i;

/* =====================================
   FLOW STRUCTURE
===================================== */

const FLOW = {
  welcome: {
    type: "message",
    intervention: "containment_boundary",
    text: "Hi, I’m Avbot. You can type how you're feeling anytime, or choose an option below.",
    next: "emotion_check"
  },

  emotion_check: {
    type: "choice",
    intervention: "emotion_identification",
    text: "What feels closest to how you're feeling right now?",
    options: [
      { label: "Anxious", next: "validate_anxious" },
      { label: "Overwhelmed", next: "validate_overwhelmed" },
      { label: "Self-critical", next: "validate_self_critical" },
      { label: "Low / drained", next: "validate_low" },
      { label: "Irritable / angry", next: "validate_angry" },
      { label: "Numb / disconnected", next: "validate_numb" }
    ]
  },

  validate_anxious: {
    type: "message",
    intervention: "validation",
    text: "That makes sense. Anxiety can feel consuming.",
    next: "reflect_common"
  },

  validate_overwhelmed: {
    type: "message",
    intervention: "validation",
    text: "When everything feels heavy, it’s hard to think clearly.",
    next: "reflect_common"
  },

  validate_self_critical: {
    type: "message",
    intervention: "validation",
    text: "Being hard on yourself can be exhausting.",
    next: "reflect_common"
  },

  validate_low: {
    type: "message",
    intervention: "validation",
    text: "Feeling drained can make even small things feel difficult.",
    next: "reflect_common"
  },

  validate_angry: {
    type: "message",
    intervention: "validation",
    text: "Anger often signals that something feels unfair or overwhelming.",
    next: "reflect_common"
  },

  validate_numb: {
    type: "message",
    intervention: "validation",
    text: "Feeling numb can sometimes be your mind’s way of protecting you.",
    next: "reflect_common"
  },

  reflect_common: {
    type: "input",
    intervention: "externalisation",
    text: "What feels most present for you right now?",
    next: "acknowledge_input"
  },

  acknowledge_input: {
    type: "message",
    intervention: "reflective_acknowledgement",
    text: "Thank you for putting that into words. Let’s take that gently.",
    next: "reframe"
  },

  reframe: {
    type: "input",
    intervention: "self_compassion_shift",
    text: "Picture yourself one week from now, feeling a little steadier. What might that version of you want to remind you of today?",
    next: "closing"
  },

  closing: {
    type: "choice",
    intervention: "session_structuring",
    text: "Would you like to reflect again, try a regulation tool, or end here?",
    options: [
      { label: "Reflect again", next: "emotion_check" },
      { label: "Breathing exercise", action: "breathing" },
      { label: "Sit with it (10s)", action: "sit" },
      { label: "Small reminder", action: "reminder" },
      { label: "End session", next: "session_summary" }
    ]
  },

  session_summary: {
    type: "summary",
    text: "Here’s what you practiced today:"
  },

  end_message: {
    type: "message",
    text: "Thank you for checking in today. You took a moment for yourself that matters."
  }
};

/* =====================================
   RENDER ENGINE
===================================== */

function addMessage(text, isUser = false) {
  const msg = document.createElement("div");
  msg.className = isUser ? "user-message" : "bot-message";
  msg.textContent = text;
  chatbox.appendChild(msg);

  scrollToBottom();
}

function addButtons(options, callback) {
  const container = document.createElement("div");
  container.className = "choice-container";

  options.forEach(option => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = option;

    btn.onclick = () => {
      addMessage(option, true);
      container.remove();
      callback(option);
    };

    container.appendChild(btn);
  });

  chatbox.appendChild(container);
  scrollToBottom();
}

function renderNode(nodeId) {
  const node = FLOW[nodeId];
  if (!node) return;

  currentNode = nodeId;

  if (node.intervention) {
    sessionData.interventionsUsed.add(node.intervention);
  }

  // Always keep input active
  userInput.focus();

  if (node.type === "message") {
    addMessage(node.text);
    if (node.next) {
      setTimeout(() => renderNode(node.next), 500);
    }
  }

  if (node.type === "choice") {
    addMessage(node.text);

    addButtons(
      node.options.map(o => o.label),
      (choice) => {
        const selected = node.options.find(o => o.label === choice);

        if (!selected) return;

        if (selected.action === "breathing") startBreathingFlow();
        else if (selected.action === "sit") startSitWithIt();
        else if (selected.action === "reminder") startReminderCard();
        else renderNode(selected.next);
      }
    );
  }

  if (node.type === "input") {
    addMessage(node.text);
  }

  if (node.type === "summary") {
    addMessage(node.text);

    const list = document.createElement("ul");

    sessionData.interventionsUsed.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.replace(/_/g, " ");
      list.appendChild(li);
    });

    chatbox.appendChild(list);

    setTimeout(() => renderNode("end_message"), 800);
  }
}

/* =====================================
   INPUT HANDLING (FIXED)
===================================== */

function handleUserInput() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, true);
  userInput.value = "";

  if (HIGH_RISK.test(text)) {
    addMessage("I’m really sorry you're feeling this way.");
    addMessage("If you need urgent medical help or advice, please call NHS 111.");
    addMessage("If you are in immediate danger, call 999.");
    return;
  }

  // Always continue flow intelligently
  const nextNode = FLOW[currentNode]?.next || "acknowledge_input";
  if (nextNode) renderNode(nextNode);
}

sendBtn.onclick = handleUserInput;

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleUserInput();
  }
});

/* =====================================
   UTIL
===================================== */

function scrollToBottom() {
  setTimeout(() => {
    chatbox.scrollTop = chatbox.scrollHeight;
  }, 50);
}

/* =====================================
   BREATHING MODAL
===================================== */

function startBreathingFlow() {
  const modal = document.createElement("div");
  modal.className = "breathing-modal";

  modal.innerHTML = `
    <div class="breathing-card">
      <h3>4–4–4 Breathing</h3>
      <div class="breath-circle" id="breathCircle">4</div>
      <div class="breath-phase" id="breathPhase">Inhale</div>
      <button id="closeBreath">Return to reflection</button>
    </div>
  `;

  document.body.appendChild(modal);

  const circle = modal.querySelector("#breathCircle");
  const phase = modal.querySelector("#breathPhase");
  const closeBtn = modal.querySelector("#closeBreath");

  let step = 0;
  const phases = ["Inhale", "Hold", "Exhale"];
  const durations = [4, 4, 4];
  let interval;

  function runPhase() {
    let count = durations[step];
    phase.textContent = phases[step];

    interval = setInterval(() => {
      circle.textContent = count;
      count--;

      if (count < 0) {
        clearInterval(interval);
        step++;
        if (step >= phases.length) {
          modal.remove();
          renderNode("closing");
        } else runPhase();
      }
    }, 1000);
  }

  runPhase();

  closeBtn.onclick = () => {
    clearInterval(interval);
    modal.remove();
    renderNode("closing");
  };
}

/* =====================================
   SIT WITH IT
===================================== */

function startSitWithIt() {
  const modal = document.createElement("div");
  modal.className = "breathing-modal";

  modal.innerHTML = `
    <div class="breathing-card">
      <h3>Just Sit With It</h3>
      <div class="breath-circle" id="sitCircle">10</div>
      <div class="breath-phase">
        For the next few seconds, allow this feeling to be here.
      </div>
      <button id="skipSit">Return to reflection</button>
    </div>
  `;

  document.body.appendChild(modal);

  const circle = modal.querySelector("#sitCircle");
  const skipBtn = modal.querySelector("#skipSit");

  let seconds = 10;

  const timer = setInterval(() => {
    seconds--;
    circle.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(timer);
      modal.remove();
      renderNode("closing");
    }
  }, 1000);

  skipBtn.onclick = () => {
    clearInterval(timer);
    modal.remove();
    renderNode("closing");
  };
}

/* =====================================
   REMINDER CARD
===================================== */

function startReminderCard() {
  const reminders = [
    "You don’t have to solve everything today.",
    "Feelings pass, even when they feel permanent.",
    "You are allowed to take up space.",
    "Rest is not failure.",
    "Small progress still counts."
  ];

  const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];

  const modal = document.createElement("div");
  modal.className = "breathing-modal";

  modal.innerHTML = `
    <div class="flip-container">
      <div class="flip-card">
        <div class="flip-inner" id="flipInner">
          <div class="flip-front">
            Tap to gently reveal a reminder ↓
          </div>
          <div class="flip-back">
            ${randomReminder}
          </div>
        </div>
      </div>

      <div style="margin-top:20px; display:flex; gap:12px; justify-content:center;">
        <button id="flipBackBtn">Flip back</button>
        <button id="closeReminder">Return to reflection</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inner = modal.querySelector("#flipInner");
  const closeBtn = modal.querySelector("#closeReminder");
  const flipBackBtn = modal.querySelector("#flipBackBtn");

  inner.onclick = () => {
    inner.classList.toggle("flipped");
  };

  flipBackBtn.onclick = () => {
    inner.classList.remove("flipped");
  };

  closeBtn.onclick = () => {
    modal.remove();
    renderNode("closing");
  };
}

/* =====================================
   INITIALISE
===================================== */

startBtn.onclick = () => {
  entryScreen.classList.add("hidden");
  chatContainer.classList.remove("hidden");

  userInput.placeholder = "You can share anything here...";
  userInput.focus();

  renderNode("welcome");
};