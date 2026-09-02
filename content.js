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
    <div class="counter-credits">By Amdad Shabbir & Ahmad Khan</div>
  `;

  const toggleBtn = counterElement.querySelector("#counter-toggle-btn");
  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCollapse(true);
  });

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
  console.log("[LinkedIn Comment Counter] Incrementing comment count! High quality:", isHighQuality);
  sendMessage("INCREMENT_COMMENT_COUNT", { isHighQuality }, (response) => {
    renderCounter(response);
  });
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function getInteractiveElement(element) {
  if (!(element instanceof Element)) return null;
  return element.closest("button, [role='button'], a[href], input[type='submit']");
}

function findNearbyTextInput(control) {
  let node = control;
  for (let i = 0; i < 4 && node; i += 1) {
    const input = node.querySelector(
      "[contenteditable='true'], textarea, .ql-editor, .comments-comment-box__editor"
    );
    if (input) return input;
    node = node.parentElement;
  }
  return null;
}

function isCommentSubmitButton(element) {
  if (!element || !(element instanceof Element)) return false;

  const control = getInteractiveElement(element);
  if (!control) return false;

  // 1. Exclude Feed Social Toolbar Toggle Buttons (Like, Comment section expander, Repost, Send)
  const isSocialBar = control.closest(".feed-shared-social-action-bar, [class*='social-actions']");
  if (isSocialBar && (control.hasAttribute("aria-expanded") || control.getAttribute("aria-pressed"))) {
    return false;
  }

  // 2. Direct Class / ID / Attribute Matching for LinkedIn Comment Submit Button
  const className = normalizeText(control.className);
  const componentKey = normalizeText(control.getAttribute("componentkey") || "");
  const id = normalizeText(control.id);
  const ariaLabel = normalizeText(control.getAttribute("aria-label") || "");
  const title = normalizeText(control.getAttribute("title") || "");
  const text = normalizeText(control.innerText || control.textContent || "");

  if (
    className.includes("comments-comment-box__submit-button") ||
    className.includes("comments-comment-box__dispatch") ||
    className.includes("comments-comment-box__form") ||
    componentKey.includes("commentbuttonsection") ||
    id.includes("comment-submit")
  ) {
    return true;
  }

  // 3. Inside a Comment Form Container or Comment Box
  const commentBox = control.closest(
    ".comments-comment-box, .comments-comment-form, .comments-comment-box__form, .comments-comment-texteditor, form[class*='comment']"
  );

  const isSubmitWord = /^(post|comment|reply|publish|send)$/i.test(text) ||
                       /post|comment|reply|publish/.test(ariaLabel) ||
                       /post|comment|reply|publish/.test(title);

  if (commentBox && isSubmitWord) {
    return true;
  }

  // 4. Proximity Fallback: Near an editable text input AND has submit-like text
  const nearbyInput = findNearbyTextInput(control);
  if (nearbyInput && (isSubmitWord || className.includes("submit") || className.includes("btn"))) {
    return true;
  }

  return false;
}

document.addEventListener(
  "click",
  (event) => {
    if (!isCommentSubmitButton(event.target)) return;

    const now = Date.now();
    if (lastCommentTarget === event.target && now - lastCommentTimestamp < 500) {
      return;
    }

    lastCommentTarget = event.target;
    lastCommentTimestamp = now;

    // Word Count for High Quality detector
    const control = getInteractiveElement(event.target);
    const textInput = control ? findNearbyTextInput(control) : null;
    const commentText = textInput ? (textInput.innerText || textInput.value || "") : "";
    const wordCount = commentText.trim().split(/\s+/).filter(Boolean).length;
    const isHighQuality = wordCount >= 10;

    incrementCounter(isHighQuality);
  },
  true
);

// Fallback form submit listener
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form && (form.classList.contains("comments-comment-box__form") || form.closest(".comments-comment-box"))) {
    const now = Date.now();
    if (now - lastCommentTimestamp > 500) {
      lastCommentTimestamp = now;
      incrementCounter(false);
    }
  }
}, true);

window.addEventListener("load", () => {
  ensureCounterUI();
  updateCounter();
});

if (document.readyState === "complete" || document.readyState === "interactive") {
  ensureCounterUI();
} else {
  document.addEventListener("DOMContentLoaded", ensureCounterUI, { once: true });
}
