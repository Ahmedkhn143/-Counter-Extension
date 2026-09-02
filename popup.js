document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goal-input");
  const saveGoalBtn = document.getElementById("save-goal-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const resetDataBtn = document.getElementById("reset-data-btn");

  const statToday = document.getElementById("stat-today");
  const statQuality = document.getElementById("stat-quality");
  const statWeek = document.getElementById("stat-week");
  const statMonth = document.getElementById("stat-month");

  const goalPercentText = document.getElementById("goal-percent-text");
  const popupProgressFill = document.getElementById("popup-progress-fill");

  function loadStats() {
    chrome.runtime.sendMessage({ type: "GET_COMMENT_COUNT" }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      const dailyCount = Number(res.dailyCount ?? 0);
      const highQualityCount = Number(res.highQualityCount ?? 0);
      const weeklyCount = Number(res.weeklyCount ?? 0);
      const monthlyCount = Number(res.monthlyCount ?? 0);
      const dailyGoal = Number(res.dailyGoal ?? 20);

      statToday.textContent = dailyCount;
      statQuality.textContent = highQualityCount;
      statWeek.textContent = weeklyCount;
      statMonth.textContent = monthlyCount;

      goalInput.value = dailyGoal;

      const percent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
      goalPercentText.textContent = `${percent}%`;
      popupProgressFill.style.width = `${percent}%`;
    });
  }

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
