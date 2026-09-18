async function getData() {
  const data = await chrome.storage.local.get([
    "dailyCount",
    "weeklyCount",
    "monthlyCount",
    "highQualityCount",
    "dailyGoal",
    "dailyResetKey",
    "weeklyResetKey",
    "monthlyResetKey",
    "widgetPosition",
    "isCollapsed",
    "history",
    "count",
    "currentStreak",
    "lastGoalCompletedDate",
    "goalCelebratedDate",
    "isEnabled",
  ]);

  const dailyCount = Number(data.dailyCount ?? data.count ?? 0);

  return {
    dailyCount,
    weeklyCount: Number(data.weeklyCount ?? 0),
    monthlyCount: Number(data.monthlyCount ?? 0),
    highQualityCount: Number(data.highQualityCount ?? 0),
    dailyGoal: Number(data.dailyGoal ?? 20),
    dailyResetKey: data.dailyResetKey || "",
    weeklyResetKey: data.weeklyResetKey || "",
    monthlyResetKey: data.monthlyResetKey || "",
    widgetPosition: data.widgetPosition || null,
    isCollapsed: Boolean(data.isCollapsed ?? false),
    isEnabled: Boolean(data.isEnabled ?? true),
    history: data.history || {},
    count: dailyCount,
    currentStreak: Number(data.currentStreak ?? 0),
    lastGoalCompletedDate: data.lastGoalCompletedDate || "",
    goalCelebratedDate: data.goalCelebratedDate || "",
  };
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYesterdayKey(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return getDateKey(d);
}

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getWeeklyResetKey(now) {
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  const dayIndex = current.getDay();
  const diffToSaturday = dayIndex === 6 ? 0 : 6 - dayIndex;
  current.setDate(current.getDate() + diffToSaturday);

  return getDateKey(current);
}

function getResetKeys(now = new Date()) {
  return {
    dailyResetKey: getDateKey(now),
    weeklyResetKey: getWeeklyResetKey(now),
    monthlyResetKey: getMonthKey(now),
  };
}

async function checkReset() {
  const data = await getData();
  const now = new Date();
  const resetKeys = getResetKeys(now);
  const yesterdayKey = getYesterdayKey(now);

  const updatedState = {
    dailyCount: data.dailyCount,
    weeklyCount: data.weeklyCount,
    monthlyCount: data.monthlyCount,
    highQualityCount: data.highQualityCount,
    dailyResetKey: data.dailyResetKey,
    weeklyResetKey: data.weeklyResetKey,
    monthlyResetKey: data.monthlyResetKey,
    history: data.history,
    currentStreak: data.currentStreak,
    lastGoalCompletedDate: data.lastGoalCompletedDate,
    goalCelebratedDate: data.goalCelebratedDate,
  };

  if (data.dailyResetKey !== resetKeys.dailyResetKey) {
    if (data.dailyResetKey) {
      updatedState.history[data.dailyResetKey] = data.dailyCount;
    }
    // Check if streak was broken (yesterday was missed and not completed today either)
    if (data.lastGoalCompletedDate !== yesterdayKey && data.lastGoalCompletedDate !== resetKeys.dailyResetKey) {
      updatedState.currentStreak = 0;
    }
    updatedState.dailyCount = 0;
    updatedState.highQualityCount = 0;
    updatedState.dailyResetKey = resetKeys.dailyResetKey;
  }

  if (data.weeklyResetKey !== resetKeys.weeklyResetKey) {
    updatedState.weeklyCount = 0;
    updatedState.weeklyResetKey = resetKeys.weeklyResetKey;
  }

  if (data.monthlyResetKey !== resetKeys.monthlyResetKey) {
    updatedState.monthlyCount = 0;
    updatedState.monthlyResetKey = resetKeys.monthlyResetKey;
  }

  await chrome.storage.local.set(updatedState);
  return { ...data, ...updatedState };
}

chrome.runtime.onInstalled.addListener(async () => {
  await checkReset();
});

chrome.runtime.onStartup.addListener(async () => {
  await checkReset();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INCREMENT_COMMENT_COUNT") {
    checkReset().then(async (resetData) => {
      const data = await getData();
      const newDailyCount = data.dailyCount + 1;
      const newWeeklyCount = data.weeklyCount + 1;
      const newMonthlyCount = data.monthlyCount + 1;
      const newHighQualityCount = message.isHighQuality ? data.highQualityCount + 1 : data.highQualityCount;

      const now = new Date();
      const dateKey = getDateKey(now);
      const yesterdayKey = getYesterdayKey(now);
      const updatedHistory = { ...data.history, [dateKey]: newDailyCount };

      let currentStreak = data.currentStreak;
      let lastGoalCompletedDate = data.lastGoalCompletedDate;
      let goalCelebratedDate = data.goalCelebratedDate;
      let triggerCelebration = false;

      // Check if daily goal achieved
      if (newDailyCount >= data.dailyGoal) {
        if (lastGoalCompletedDate !== dateKey) {
          if (lastGoalCompletedDate === yesterdayKey) {
            currentStreak = (currentStreak || 0) + 1;
          } else {
            currentStreak = 1;
          }
          lastGoalCompletedDate = dateKey;
        }

        if (goalCelebratedDate !== dateKey) {
          triggerCelebration = true;
          goalCelebratedDate = dateKey;
        }
      }

      await chrome.storage.local.set({
        dailyCount: newDailyCount,
        weeklyCount: newWeeklyCount,
        monthlyCount: newMonthlyCount,
        highQualityCount: newHighQualityCount,
        count: newDailyCount,
        history: updatedHistory,
        currentStreak,
        lastGoalCompletedDate,
        goalCelebratedDate,
      });

      sendResponse({
        count: newDailyCount,
        dailyCount: newDailyCount,
        weeklyCount: newWeeklyCount,
        monthlyCount: newMonthlyCount,
        highQualityCount: newHighQualityCount,
        dailyGoal: data.dailyGoal,
        isCollapsed: data.isCollapsed,
        isEnabled: data.isEnabled,
        widgetPosition: data.widgetPosition,
        currentStreak,
        triggerCelebration,
      });
    });

    return true;
  }

  if (message.type === "GET_COMMENT_COUNT") {
    checkReset().then(async () => {
      const data = await getData();

      sendResponse({
        count: data.dailyCount,
        dailyCount: data.dailyCount,
        weeklyCount: data.weeklyCount,
        monthlyCount: data.monthlyCount,
        highQualityCount: data.highQualityCount,
        dailyGoal: data.dailyGoal,
        isCollapsed: data.isCollapsed,
        isEnabled: data.isEnabled,
        widgetPosition: data.widgetPosition,
        history: data.history,
        currentStreak: data.currentStreak,
      });
    });

    return true;
  }

  if (message.type === "SET_ENABLED") {
    const isEnabled = Boolean(message.isEnabled);
    chrome.storage.local.set({ isEnabled }).then(() => {
      chrome.tabs.query({ url: "https://www.linkedin.com/*" }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { type: "STATE_CHANGED", isEnabled }).catch(() => {});
        });
      });
      sendResponse({ success: true, isEnabled });
    });
    return true;
  }

  if (message.type === "SET_DAILY_GOAL") {
    const goal = Math.max(1, Number(message.dailyGoal || 20));
    chrome.storage.local.set({ dailyGoal: goal }).then(() => {
      sendResponse({ success: true, dailyGoal: goal });
    });
    return true;
  }

  if (message.type === "SET_COLLAPSED") {
    chrome.storage.local.set({ isCollapsed: Boolean(message.isCollapsed) }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "SET_POSITION") {
    chrome.storage.local.set({ widgetPosition: message.widgetPosition }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "RESET_ALL_DATA") {
    chrome.storage.local.set({
      dailyCount: 0,
      weeklyCount: 0,
      monthlyCount: 0,
      highQualityCount: 0,
      count: 0,
      history: {},
      currentStreak: 0,
      lastGoalCompletedDate: "",
      goalCelebratedDate: "",
    }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});
