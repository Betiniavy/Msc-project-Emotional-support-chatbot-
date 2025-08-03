
const tips = [
    "Be gentle with yourself today.",
    "It’s okay to not be okay.",
    "You are doing your best and that’s enough.",
    "One step at a time. You've got this.",
    "Your feelings are valid.",
];

document.getElementById("dailyTip").innerText = tips[Math.floor(Math.random() * tips.length)];

function addMessage(text, isUser = false) {
    const msg = document.createElement("div");
    msg.className = isUser ? "user-message" : "bot-message";
    msg.innerText = text;
    document.getElementById("chatbox").appendChild(msg);
    document.getElementById("chatbox").scrollTop = document.getElementById("chatbox").scrollHeight;
}

function handleFeeling(feeling) {
    document.getElementById("userInput").value = "";
    addMessage("I feel " + feeling, true);
    replyToFeeling(feeling);
}

function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (text) {
        addMessage(text, true);
        input.value = "";
        if (text.toLowerCase().includes("anxious") || text.toLowerCase().includes("sad") ||
            text.toLowerCase().includes("angry") || text.toLowerCase().includes("numb") || 
            text.toLowerCase().includes("overwhelmed")) {
            replyToFeeling(text.toLowerCase());
        } else {
            handleChoice(text.toLowerCase());
        }
    }
}

function replyToFeeling(feeling) {
    addMessage("That sounds really tough. I'm here to support you. Would you like to talk about what's making you feel this, or take a moment to breathe together?");
    addChoices();
}

function addChoices() {
    const choiceDiv = document.createElement("div");
    choiceDiv.className = "choice-buttons";
    ["Talk about it", "Take a breathing exercise", "Just sit with it"].forEach(option => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => handleChoice(option.toLowerCase());
        choiceDiv.appendChild(btn);
    });
    document.getElementById("chatbox").appendChild(choiceDiv);
}

function handleChoice(choice) {
    if (choice.includes("talk")) {
        addMessage("Go ahead, I’m listening. What’s been going on today?");
    } else if (choice.includes("breathing")) {
        addMessage("Let's try a breathing exercise: Breathe in... Breathe out... Nice and slow.");
        addMessage("Would you like to continue or end the chat?");
        addEndOptions();
    } else if (choice.includes("sit")) {
        addMessage("It's okay to just sit with your feelings. You're not alone.");
        addMessage("Would you like to continue, talk about it, or end the chat?");
        addChoices();
        addEndOptions();
    } else if (choice.includes("end")) {
        addMessage("Thank you for sharing this space with me today. Take care. 🌿");
    }
}

function addEndOptions() {
    const endDiv = document.createElement("div");
    endDiv.className = "choice-buttons";
    ["Continue", "End chat"].forEach(option => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => handleChoice(option.toLowerCase());
        endDiv.appendChild(btn);
    });
    document.getElementById("chatbox").appendChild(endDiv);
}
