let counterElement = null;
let lastCommentTarget = null;
let lastCommentTimestamp = 0;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isEnabled = true;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_CHANGED") {
    isEnabled = Boolean(message.isEnabled);
    if (!isEnabled) {
      if (counterElement && counterElement.parentElement) {
        counterElement.remove();
        counterElement = null;
      }
    } else {
      ensureCounterUI();
      updateCounter();
    }
  }
});

function sendMessage(type, payload = {}, callback = null) {
  chrome.runtime.sendMessage({ type, ...payload }, (response) => {
    if (chrome.runtime.lastError) return;
    callback?.(response);
  });
}

function ensureCounterUI() {
  if (!isEnabled) return;
  const body = document.body;
  if (!body) return;

  if (counterElement && counterElement.isConnected) return;

  counterElement = document.createElement("div");
  counterElement.id = "linkedin-comment-counter";
  
  body.appendChild(counterElement);
  updateCounter();
}

function isLinkedInDarkMode() {
  return (
    document.documentElement.classList.contains("theme--dark") ||
    document.body?.classList.contains("theme--dark") ||
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

function applyTheme() {
  if (!counterElement) return;
  counterElement.classList.toggle("theme-dark", Boolean(isLinkedInDarkMode()));
}

function fireConfetti() {
  if (!counterElement) return;
  const rect = counterElement.getBoundingClientRect();
  const originX = Math.max(20, rect.left + rect.width / 2);
  const originY = Math.max(20, rect.top + 20);

  const container = document.createElement("div");
  container.className = "counter-confetti-container";
  document.body.appendChild(container);

  const colors = ["#0a66c2", "#38a169", "#e0245e", "#ffad1f", "#7952b3", "#00c4cc", "#f59e0b"];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("div");
    p.className = "counter-confetti-particle";
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${originX}px`;
    p.style.top = `${originY}px`;

    const angle = Math.random() * 2 * Math.PI;
    const velocity = 50 + Math.random() * 90;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 70;
    p.style.setProperty("--tx", `${tx}px`);
    p.style.setProperty("--ty", `${ty}px`);
    p.style.animationDuration = `${0.9 + Math.random() * 0.6}s`;

    container.appendChild(p);
  }

  setTimeout(() => {
    container.remove();
  }, 1800);
}

function renderCounter(response) {
  if (!response) return;

  if (typeof response.isEnabled !== "undefined") {
    isEnabled = Boolean(response.isEnabled);
  }

  if (!isEnabled) {
    if (counterElement && counterElement.parentElement) {
      counterElement.remove();
      counterElement = null;
    }
    return;
  }

  if (!counterElement) {
    ensureCounterUI();
    if (!counterElement) return;
  }

  const dailyCount = Number(response.dailyCount ?? response.count ?? 0);
  const weeklyCount = Number(response.weeklyCount ?? 0);
  const monthlyCount = Number(response.monthlyCount ?? 0);
  const highQualityCount = Number(response.highQualityCount ?? 0);
  const dailyGoal = Number(response.dailyGoal ?? 20);
  const currentStreak = Number(response.currentStreak ?? 0);
  const isCollapsed = Boolean(response.isCollapsed);
  const pos = response.widgetPosition;

  applyTheme();

  if (pos && typeof pos.top === "number" && typeof pos.left === "number") {
    counterElement.style.top = `${pos.top}px`;
    counterElement.style.left = `${pos.left}px`;
    counterElement.style.right = "auto";
  }

  const percent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
  const streakText = currentStreak > 0 ? ` · 🔥${currentStreak}` : "";

  if (isCollapsed) {
    counterElement.className = "collapsed" + (isLinkedInDarkMode() ? " theme-dark" : "");
    counterElement.innerHTML = `
      <div class="counter-collapsed-badge" title="Click to expand LinkedIn Comment Counter">
        <span class="badge-icon">💬</span>
        <span class="badge-text">${dailyCount}/${dailyGoal}${streakText}</span>
      </div>
    `;
    const badge = counterElement.querySelector(".counter-collapsed-badge");
    badge?.addEventListener("click", () => {
      toggleCollapse(false);
    });
    return;
  }

  const streakBadgeHtml = currentStreak > 0
    ? `<div class="counter-streak-badge" title="${currentStreak} consecutive days meeting your goal!"><span class="fire-icon">🔥</span> ${currentStreak}-Day Streak</div>`
    : "";

  counterElement.className = isLinkedInDarkMode() ? "theme-dark" : "";
  counterElement.innerHTML = `
    <div class="counter-card-header" id="counter-drag-handle">
      <span class="drag-grip">⋮⋮</span>
      <span class="counter-card-title">Comments</span>
      <button id="counter-toggle-btn" class="counter-icon-btn" title="Minimize">-</button>
    </div>
    
    <div class="counter-progress-container" title="${percent}% of daily goal completed">
      <div class="counter-progress-bar" style="width: ${percent}%"></div>
    </div>
    <div class="counter-goal-row">
      <span class="counter-goal-text">Goal: ${dailyCount}/${dailyGoal} (${percent}%)</span>
      ${streakBadgeHtml}
    </div>

    <div class="counter-stats-grid">
      <div class="stat-item"><span class="stat-label">Today:</span> <span class="stat-value">${dailyCount}</span></div>
      <div class="stat-item"><span class="stat-label">Quality (>10w):</span> <span class="stat-value">${highQualityCount}</span></div>
      <div class="stat-item"><span class="stat-label">This Week:</span> <span class="stat-value">${weeklyCount}</span></div>
      <div class="stat-item"><span class="stat-label">This Month:</span> <span class="stat-value">${monthlyCount}</span></div>
    </div>
    <div class="counter-credits">By Muhammad Ahmad</div>
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
    if (response?.triggerCelebration) {
      fireConfetti();
    }
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

// Mouse click submit detection
document.addEventListener(
  "click",
  (event) => {
    if (!isEnabled) return;
    if (!isCommentSubmitButton(event.target)) return;

    const now = Date.now();
    if (lastCommentTarget === event.target && now - lastCommentTimestamp < 800) {
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

// Keyboard Enter / Ctrl+Enter detection inside comment editor
document.addEventListener(
  "keydown",
  (event) => {
    if (!isEnabled) return;
    if (event.key !== "Enter") return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    // Check if target is inside an editable comment area
    const isCommentBox = target.closest(
      ".comments-comment-box, .comments-comment-form, .comments-comment-texteditor, form[class*='comment'], .feed-shared-update-v2 form"
    );
    const isContentEditable = target.isContentEditable || target.classList.contains("ql-editor") || target.tagName === "TEXTAREA";

    if (!isCommentBox && !isContentEditable) return;

    // Shift + Enter is typically used for line break, not submit
    if (event.shiftKey) return;

    const text = (target.innerText || target.value || target.textContent || "").trim();
    if (!text || text.length === 0) return;

    const now = Date.now();
    // Prevent double counting if both keydown and button click trigger
    if (lastCommentTarget === target && now - lastCommentTimestamp < 800) {
      return;
    }

    lastCommentTarget = target;
    lastCommentTimestamp = now;

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isHighQuality = wordCount >= 10;

    incrementCounter(isHighQuality);
  },
  true
);

// Fallback form submit listener
document.addEventListener("submit", (event) => {
  if (!isEnabled) return;
  const form = event.target;
  if (form && (form.classList.contains("comments-comment-box__form") || form.closest(".comments-comment-box"))) {
    const now = Date.now();
    if (now - lastCommentTimestamp > 800) {
      lastCommentTimestamp = now;
      incrementCounter(false);
    }
  }
}, true);

// Theme observer for LinkedIn dark mode toggling
const themeObserver = new MutationObserver(() => {
  applyTheme();
});
if (document.documentElement) {
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

window.addEventListener("load", () => {
  ensureCounterUI();
  updateCounter();
  applyTheme();
});

if (document.readyState === "complete" || document.readyState === "interactive") {
  ensureCounterUI();
  applyTheme();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    ensureCounterUI();
    applyTheme();
  }, { once: true });
}
