let counterElement = null;
let lastCommentTarget = null;
let lastCommentTimestamp = 0;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function sendMessage(type, payload = {}, callback = null) {
  chrome.runtime.sendMessage({ type, ...payload }, (response) => {
    if (chrome.runtime.lastError) return;
    callback?.(response);
  });
}

function ensureCounterUI() {
  const body = document.body;
  if (!body) return;

  if (counterElement && counterElement.isConnected) return;

  counterElement = document.createElement("div");
  counterElement.id = "linkedin-comment-counter";
  
  body.appendChild(counterElement);
  updateCounter();
}

function renderCounter(response) {
  if (!response || !counterElement) return;

  const dailyCount = Number(response.dailyCount ?? response.count ?? 0);
  const weeklyCount = Number(response.weeklyCount ?? 0);
  const monthlyCount = Number(response.monthlyCount ?? 0);
  const highQualityCount = Number(response.highQualityCount ?? 0);
  const dailyGoal = Number(response.dailyGoal ?? 20);
  const isCollapsed = Boolean(response.isCollapsed);
  const pos = response.widgetPosition;

  // Restore position if saved
  if (pos && typeof pos.top === "number" && typeof pos.left === "number") {
    counterElement.style.top = `${pos.top}px`;
    counterElement.style.left = `${pos.left}px`;
    counterElement.style.right = "auto";
  }

  const percent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));

  if (isCollapsed) {
    counterElement.className = "collapsed";
    counterElement.innerHTML = `
      <div class="counter-collapsed-badge" title="Click to expand LinkedIn Comment Counter">
        <span class="badge-icon">💬</span>
        <span class="badge-text">${dailyCount}/${dailyGoal}</span>
      </div>
    `;
    const badge = counterElement.querySelector(".counter-collapsed-badge");
    badge?.addEventListener("click", () => {
      toggleCollapse(false);
    });
    return;
  }

  counterElement.className = "";
  counterElement.innerHTML = `
    <div class="counter-card-header" id="counter-drag-handle">
      <span class="drag-grip">⋮⋮</span>
      <span class="counter-card-title">Comments</span>
      <button id="counter-toggle-btn" class="counter-icon-btn" title="Minimize">-</button>
    </div>
    
    <div class="counter-progress-container" title="${percent}% of daily goal completed">
      <div class="counter-progress-bar" style="width: ${percent}%"></div>
    </div>
    <div class="counter-goal-text">Goal: ${dailyCount}/${dailyGoal} (${percent}%)</div>

    <div class="counter-stats-grid">
      <div class="stat-item"><span class="stat-label">Today:</span> <span class="stat-value">${dailyCount}</span></div>
      <div class="stat-item"><span class="stat-label">Quality (>10w):</span> <span class="stat-value">${highQualityCount}</span></div>
      <div class="stat-item"><span class="stat-label">This Week:</span> <span class="stat-value">${weeklyCount}</span></div>
      <div class="stat-item"><span class="stat-label">This Month:</span> <span class="stat-value">${monthlyCount}</span></div>
    </div>
  `;

  // Toggle Collapse Listener
  const toggleBtn = counterElement.querySelector("#counter-toggle-btn");
  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCollapse(true);
  });

  // Setup Dragging
  setupDragging();
}

function toggleCollapse(collapsed) {
  sendMessage("SET_COLLAPSED", { isCollapsed: collapsed }, () => {
    updateCounter();
  });
}

function setupDragging() {
  const handle = counterElement?.querySelector("#counter-drag-handle");
  if (!handle) return;

  handle.addEventListener("mousedown", (e) => {
    if (e.target.id === "counter-toggle-btn") return;
    isDragging = true;
    const rect = counterElement.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function onMouseMove(e) {
  if (!isDragging || !counterElement) return;
  const left = Math.max(10, Math.min(window.innerWidth - counterElement.offsetWidth - 10, e.clientX - dragOffsetX));
  const top = Math.max(10, Math.min(window.innerHeight - counterElement.offsetHeight - 10, e.clientY - dragOffsetY));

  counterElement.style.left = `${left}px`;
  counterElement.style.top = `${top}px`;
  counterElement.style.right = "auto";
}

function onMouseUp() {
  if (!isDragging || !counterElement) return;
  isDragging = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);

  const rect = counterElement.getBoundingClientRect();
  sendMessage("SET_POSITION", { widgetPosition: { top: rect.top, left: rect.left } });
}

function updateCounter() {
  sendMessage("GET_COMMENT_COUNT", {}, (response) => {
    renderCounter(response);
  });
}

function incrementCounter(isHighQuality = false) {
  sendMessage("INCREMENT_COMMENT_COUNT", { isHighQuality }, (response) => {
    renderCounter(response);
  });
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isDecorativeIconElement(element) {
  if (!(element instanceof Element)) return false;
  const tagName = element.tagName.toLowerCase();
  return ["svg", "path", "use", "img", "i"].includes(tagName);
}

function getInteractiveElement(element) {
  if (!(element instanceof Element)) return null;
  return element.closest("button, [role='button'], a[href]");
}

function isCommentToggleButton(control) {
  if (control.hasAttribute("aria-expanded")) return true;
  const socialBar = control.closest(
    "[class*='social-actions'], [class*='feed-shared-social-action-bar']",
  );
  return !!socialBar;
}

function findNearbyTextInput(control) {
  let node = control;
  for (let i = 0; i < 3 && node; i += 1) {
    const input = node.querySelector(
      "[contenteditable='true'], textarea, .ql-editor",
    );
    if (input) return input;
    node = node.parentElement;
  }
  return null;
}

function hasCommentSubmitComponentKey(control) {
  const componentKey = normalizeText(control.getAttribute("componentkey"));
  return /commentbuttonsection/.test(componentKey);
}

function isCommentSubmitButton(control) {
  if (isCommentToggleButton(control)) return false;
  if (hasCommentSubmitComponentKey(control)) return true;
  return !!findNearbyTextInput(control);
}

function isCommentButton(element) {
  if (!element || !(element instanceof Element)) return false;
  const control = getInteractiveElement(element);
  if (!control) return false;

  if (isDecorativeIconElement(element)) return false;

  const targetTag = (element.tagName || "").toLowerCase();
  const targetText = normalizeText(element.innerText || element.textContent);
  const ariaLabel = normalizeText(control.getAttribute("aria-label"));
  const title = normalizeText(control.getAttribute("title"));
  const dataControlName = normalizeText(control.getAttribute("data-control-name"));
  const text = normalizeText(control.innerText || control.textContent);

  const label = `${ariaLabel} ${title} ${dataControlName} ${text}`;
  if (!/comment/.test(label)) return false;

  if (element !== control) {
    const targetMatches = ["span", "div", "p"].includes(targetTag) && /comment/.test(targetText);
    if (!targetMatches) return false;
  }

  return isCommentSubmitButton(control);
}

document.addEventListener(
  "click",
  (event) => {
    if (!isCommentButton(event.target)) return;

    const now = Date.now();
    if (lastCommentTarget === event.target && now - lastCommentTimestamp < 400) {
      return;
    }

    lastCommentTarget = event.target;
    lastCommentTimestamp = now;

    // Check comment word count for High Quality metric (> 10 words)
    const control = getInteractiveElement(event.target);
    const textInput = control ? findNearbyTextInput(control) : null;
    const commentText = textInput ? (textInput.innerText || textInput.value || "") : "";
    const wordCount = commentText.trim().split(/\s+/).filter(Boolean).length;
    const isHighQuality = wordCount >= 10;

    incrementCounter(isHighQuality);
  },
  true,
);

window.addEventListener("load", () => {
  ensureCounterUI();
  updateCounter();
});

if (document.readyState === "complete" || document.readyState === "interactive") {
  ensureCounterUI();
} else {
  document.addEventListener("DOMContentLoaded", ensureCounterUI, { once: true });
}
