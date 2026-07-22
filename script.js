// This script runs a simple three-step AI workflow.
// The difference from a fully automatic workflow is that each stage pauses for
// a human to click a button before the next agent starts.

const startButton = document.getElementById("startWorkflowBtn");
const proxyUrl = "https://vibe-proxy-gqv4.onrender.com/v1/chat/completions";
const authHeader = "Bearer sk-vibe-summer-2026";

// We store references to the text areas, status lines, and proceed buttons.
const responseBoxes = {
  1: document.getElementById("response1"),
  2: document.getElementById("response2"),
  3: document.getElementById("response3"),
};

const statusLines = {
  1: document.getElementById("status1"),
  2: document.getElementById("status2"),
  3: document.getElementById("status3"),
};

const proceedButtons = {
  2: document.getElementById("proceed2"),
};

const topicChoicesContainer = document.getElementById("topicChoices");
const rerunStage1Button = document.getElementById("rerunStage1Btn");

// This helper updates the card UI when a request is in progress.
function setLoading(cardNumber, message) {
  responseBoxes[cardNumber].value = "Loading...";
  statusLines[cardNumber].textContent = message;
}

// This helper updates the card UI after a request finishes successfully.
function showResult(cardNumber, content) {
  responseBoxes[cardNumber].value = content;
  statusLines[cardNumber].textContent = "Completed";
}

// This helper shows an error if something goes wrong.
function showError(cardNumber, errorMessage) {
  responseBoxes[cardNumber].value = `Error: ${errorMessage}`;
  statusLines[cardNumber].textContent = "Error";
}

function hideProceedButton(cardNumber) {
  if (proceedButtons[cardNumber]) {
    proceedButtons[cardNumber].hidden = true;
  }
}

function showProceedButton(cardNumber, label) {
  if (proceedButtons[cardNumber]) {
    proceedButtons[cardNumber].textContent = label;
    proceedButtons[cardNumber].hidden = false;
  }
}

function resetWorkflowUI() {
  Object.keys(responseBoxes).forEach((key) => {
    responseBoxes[key].value = "";
    statusLines[key].textContent = "Waiting";
  });

  topicChoicesContainer.innerHTML = "";
  rerunStage1Button.hidden = true;
  hideProceedButton(2);
}

function showRerunStage1Button() {
  rerunStage1Button.hidden = false;
}

function hideRerunStage1Button() {
  rerunStage1Button.hidden = true;
}

function parseTopics(content) {
  const rawLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedTopics = rawLines.map((line) => {
    return line
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();
  });

  return parsedTopics.filter(Boolean).slice(0, 5);
}

function renderTopicChoices(content) {
  const topics = parseTopics(content);
  topicChoicesContainer.innerHTML = "";

  if (topics.length === 0) {
    topicChoicesContainer.innerHTML = '<p class="status">No topics were returned.</p>';
    return;
  }

  const label = document.createElement("p");
  label.className = "card-label";
  label.textContent = "Choose one topic to send to Agent 2:";
  topicChoicesContainer.appendChild(label);

  topics.forEach((topic) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.textContent = topic;
    button.addEventListener("click", () => {
      proceedToAgent2(topic);
    });
    topicChoicesContainer.appendChild(button);
  });
}

// The main async function sends one request to the proxy.
// It waits for the response, extracts the AI text, and returns it.
async function callAgent(cardNumber, systemPrompt, userPrompt) {
  // Show that this card is busy before making the request.
  setLoading(cardNumber, `Agent ${cardNumber} is thinking...`);

  try {
    // Build the exact body format requested by the assignment.
    const body = {
      model: "class-chat-model",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    // Send the POST request to the proxy.
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    // If the server responds with a problem status, throw an error.
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    // Parse the JSON response.
    const data = await response.json();

    // Extract the content from the response structure the assignment asks for.
    const content = data?.choices?.[0]?.message?.content?.trim() || "";

    // Show the result in the correct card.
    showResult(cardNumber, content);

    return content;
  } catch (error) {
    // If anything fails, display a helpful message.
    showError(cardNumber, error.message);
    return "";
  }
}

async function runStage1() {
  startButton.disabled = true;
  startButton.textContent = "Working...";

  const topicList = await callAgent(
    1,
    "You are a creative brainstorming agent. Generate exactly 5 fresh, varied educational topics from different subjects, suitable for grade 8. Make them feel new and interesting, not repetitive. Output only five topic names, each on its own line, with no numbering or extra text.",
    "Give me 5 new topics from different subjects."
  );

  if (!topicList) {
    startButton.disabled = false;
    startButton.textContent = "Start Workflow";
    return false;
  }

  // After Agent 1 completes, let the human choose which topic moves on.
  statusLines[1].textContent = "Choose one topic to continue to Agent 2.";
  renderTopicChoices(topicList);
  showRerunStage1Button();
  startButton.disabled = false;
  startButton.textContent = "Start Workflow";
  return true;
}

// This function begins the workflow by running Agent 1 immediately.
async function startWorkflow() {
  resetWorkflowUI();
  await runStage1();
}

async function rerunStage1() {
  hideRerunStage1Button();
  topicChoicesContainer.innerHTML = "";
  await runStage1();
}

// This function runs Agent 2 after the user clicks a topic choice.
async function proceedToAgent2(selectedTopic) {
  topicChoicesContainer.innerHTML = "";
  statusLines[2].textContent = "Agent 2 is writing the essay...";

  const essay = await callAgent(
    2,
    "You are an 8th-grade student. Write a short, 2-paragraph essay about the topic the user provides. You must intentionally include 3 or 4 minor spelling mistakes, a run-on sentence, and slightly informal language.",
    selectedTopic
  );

  if (!essay) {
    return;
  }

  // After Agent 2 completes, pause and wait for the human to continue.
  statusLines[2].textContent = "Completed. Click to continue to Agent 3.";
  showProceedButton(2, "Proceed to Agent 3");
}

// This function runs Agent 3 after the user clicks the button.
async function proceedToAgent3() {
  hideProceedButton(2);

  await callAgent(
    3,
    "You are a strict but fair 12th-grade English teacher. Review the essay provided by the user. First, write a short paragraph pointing out the spelling and grammar mistakes. Then, provide a perfectly rewritten version of the essay.",
    responseBoxes[2].value
  );
}

// Attach the workflow to the button clicks.
startButton.addEventListener("click", startWorkflow);
rerunStage1Button.addEventListener("click", rerunStage1);
proceedButtons[2].addEventListener("click", proceedToAgent3);
