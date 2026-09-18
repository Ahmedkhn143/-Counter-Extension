document.addEventListener("DOMContentLoaded", () => {
  const extensionToggle = document.getElementById("extension-toggle");
  const statusText = document.getElementById("status-text");
  const goalInput = document.getElementById("goal-input");
  const saveGoalBtn = document.getElementById("save-goal-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const resetDataBtn = document.getElementById("reset-data-btn");

  const statToday = document.getElementById("stat-today");
  const statQuality = document.getElementById("stat-quality");
  const statWeek = document.getElementById("stat-week");
  const statMonth = document.getElementById("stat-month");
  const statStreak = document.getElementById("stat-streak");
  const chartContainer = document.getElementById("activity-chart");
  const chartTotalText = document.getElementById("chart-total-text");

  const goalPercentText = document.getElementById("goal-percent-text");
  const popupProgressFill = document.getElementById("popup-progress-fill");

  function updateStatusUI(isEnabled) {
    extensionToggle.checked = isEnabled;
    statusText.textContent = isEnabled ? "Active (ON)" : "Disabled (OFF)";
    statusText.classList.toggle("disabled", !isEnabled);
  }

  function renderChart(history = {}, dailyCount = 0, dailyGoal = 20) {
    if (!chartContainer) return;
    const days = [];
    const now = new Date();
    let total7Days = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;

      const count = i === 0 ? dailyCount : Number(history[key] ?? 0);
      total7Days += count;

      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
      days.push({
        key,
        dayLabel,
        count,
        isToday: i === 0,
      });
    }

    if (chartTotalText) {
      chartTotalText.textContent = `${total7Days} total`;
    }

    const maxCount = Math.max(dailyGoal, ...days.map((item) => item.count), 1);
    chartContainer.innerHTML = "";

    days.forEach((item) => {
      const col = document.createElement("div");
      col.className = "chart-col";
      col.title = `${item.key}: ${item.count} comments`;

      const heightPct = Math.max(6, Math.min(100, Math.round((item.count / maxCount) * 100)));
      const isGoalMet = item.count >= dailyGoal && item.count > 0;

      col.innerHTML = `
        <span class="chart-val">${item.count}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill ${item.isToday ? "is-today" : ""} ${isGoalMet ? "goal-met" : ""}" style="height: ${heightPct}%"></div>
        </div>
        <span class="chart-day ${item.isToday ? "is-today" : ""}">${item.dayLabel}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  function loadStats() {
    chrome.runtime.sendMessage({ type: "GET_COMMENT_COUNT" }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      const dailyCount = Number(res.dailyCount ?? 0);
      const highQualityCount = Number(res.highQualityCount ?? 0);
      const weeklyCount = Number(res.weeklyCount ?? 0);
      const monthlyCount = Number(res.monthlyCount ?? 0);
      const dailyGoal = Number(res.dailyGoal ?? 20);
      const currentStreak = Number(res.currentStreak ?? 0);
      const isEnabled = Boolean(res.isEnabled ?? true);

      updateStatusUI(isEnabled);

      statToday.textContent = dailyCount;
      statQuality.textContent = highQualityCount;
      statWeek.textContent = weeklyCount;
      statMonth.textContent = monthlyCount;
      if (statStreak) statStreak.textContent = currentStreak;

      goalInput.value = dailyGoal;

      const percent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
      goalPercentText.textContent = `${percent}%`;
      popupProgressFill.style.width = `${percent}%`;

      renderChart(res.history || {}, dailyCount, dailyGoal);
    });
  }

  extensionToggle.addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    chrome.runtime.sendMessage({ type: "SET_ENABLED", isEnabled }, (res) => {
      if (res?.success) {
        updateStatusUI(isEnabled);
      }
    });
  });

  saveGoalBtn.addEventListener("click", () => {
    const val = parseInt(goalInput.value, 10);
    if (isNaN(val) || val < 1) return;

    chrome.runtime.sendMessage({ type: "SET_DAILY_GOAL", dailyGoal: val }, (res) => {
      if (res?.success) {
        saveGoalBtn.textContent = "Saved!";
        setTimeout(() => { saveGoalBtn.textContent = "Save"; }, 1500);
        loadStats();
      }
    });
  });

  exportCsvBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "GET_COMMENT_COUNT" }, (res) => {
      if (!res) return;

      const history = res.history || {};
      let csvContent = "data:text/csv;charset=utf-8,Date,Comments Count\n";

      // Add historical dates
      Object.keys(history).sort().forEach((date) => {
        csvContent += `${date},${history[date]}\n`;
      });

      // Add current day if not in history
      const todayKey = new Date().toISOString().split("T")[0];
      if (!history[todayKey]) {
        csvContent += `${todayKey},${res.dailyCount}\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `linkedin_comment_report_${todayKey}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  resetDataBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all comment counts to 0?")) {
      chrome.runtime.sendMessage({ type: "RESET_ALL_DATA" }, () => {
        loadStats();
      });
    }
  });

  loadStats();
});
