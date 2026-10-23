// Main Application Controller for CodeStreak — The Learning Arena (Active Orange 3D Glass)

document.addEventListener("DOMContentLoaded", async () => {
  // App State
  let currentProfile = null;
  let subjectsList = [];
  let currentView = "dashboard";
  let configuredMatchLength = 5;

  // Cache DOM Elements
  const views = {
    dashboard: document.getElementById("view-dashboard"),
    arena: document.getElementById("view-arena"),
    results: document.getElementById("view-results"),
    store: document.getElementById("view-store"),
    achievements: document.getElementById("view-achievements"),
    upload: document.getElementById("view-upload")
  };

  // Sound Toggle Button
  const soundBtn = document.getElementById("sound-toggle-btn");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      const isMuted = window.soundEngine.toggleMute();
      soundBtn.innerHTML = isMuted 
        ? `<i data-lucide="volume-x" class="w-4 h-4 text-rose-500"></i>`
        : `<i data-lucide="volume-2" class="w-4 h-4 text-orange-400"></i>`;
      lucide.createIcons();
    });
  }

  // Confetti celebration helper
  function triggerConfetti() {
    if (typeof confetti === "function") {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff6b00', '#f97316', '#fbbf24', '#f59e0b', '#ef4444']
      });
    }
  }

  // Switch View
  function switchView(viewName) {
    currentView = viewName;
    Object.keys(views).forEach(key => {
      if (views[key]) {
        if (key === viewName) {
          views[key].classList.remove("hidden");
        } else {
          views[key].classList.add("hidden");
        }
      }
    });

    // Update active nav state
    document.querySelectorAll(".nav-link").forEach(el => {
      if (el.dataset.view === viewName) {
        el.classList.add("text-orange-400", "bg-orange-500/20", "border-orange-500/40");
        el.classList.remove("text-stone-400");
      } else {
        el.classList.remove("text-orange-400", "bg-orange-500/20", "border-orange-500/40");
        el.classList.add("text-stone-400");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    lucide.createIcons();
  }

  // Setup Navigation Clicks
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) switchView(view);
    });
  });

  // Match length configurator buttons on Dashboard
  document.querySelectorAll(".match-length-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".match-length-btn").forEach(b => {
        b.className = "match-length-btn px-3 py-1 rounded-lg text-xs font-bold bg-[#1e1008] text-stone-300 hover:text-white border border-orange-500/30";
      });
      btn.className = "match-length-btn px-3 py-1 rounded-lg text-xs font-bold bg-orange-500 text-black border border-orange-400 shadow-md shadow-orange-500/30";
      configuredMatchLength = parseInt(btn.dataset.matchLength) || 5;
    });
  });

  // Load and Render User Profile Header
  async function refreshProfile() {
    try {
      currentProfile = await CodeStreakAPI.getProfile();
      if (!currentProfile) return;

      // Update Nav / Header Elements
      document.getElementById("header-username").textContent = currentProfile.username || "CodeWarrior";
      document.getElementById("header-avatar").textContent = currentProfile.avatar || "⚡";
      document.getElementById("header-level").textContent = `LVL ${currentProfile.level || 1}`;
      document.getElementById("header-coins").textContent = (currentProfile.coins || 0).toLocaleString();
      document.getElementById("header-streak").textContent = `${currentProfile.streak || 1}`;

      // XP Progress Bar in Dashboard
      const xpPercent = Math.min(100, Math.round(((currentProfile.currentLevelXp || 0) / (currentProfile.xpToNextLevel || 100)) * 100));
      const xpBar = document.getElementById("dash-xp-bar");
      if (xpBar) xpBar.style.width = `${xpPercent}%`;
      const xpText = document.getElementById("dash-xp-text");
      if (xpText) xpText.textContent = `${currentProfile.currentLevelXp || 0} / ${currentProfile.xpToNextLevel || 100} XP`;

      // Streak Freeze Badge
      const freezeCount = currentProfile.inventory?.streakFreeze || 0;
      const freezeBadge = document.getElementById("streak-freeze-count");
      if (freezeBadge) freezeBadge.textContent = freezeCount;

      renderWeeklyHeatmap();
      renderAchievementsShelf();
    } catch (err) {
      console.error("Profile refresh failed", err);
    }
  }

  // Weekly Heatmap
  function renderWeeklyHeatmap() {
    const container = document.getElementById("weekly-activity-grid");
    if (!container || !currentProfile) return;
    container.innerHTML = "";

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const count = currentProfile.weeklyActivity?.[iso] || 0;
      const dayName = days[(d.getDay() + 6) % 7];

      const dayCol = document.createElement("div");
      dayCol.className = "flex flex-col items-center gap-1.5";
      dayCol.innerHTML = `
        <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
          count > 0 
            ? "bg-gradient-orange text-black shadow-lg shadow-orange-500/30 scale-105 border border-orange-400" 
            : "bg-[#180d07] text-stone-600 border border-orange-500/20"
        }">
          ${count > 0 ? "✓" : ""}
        </div>
        <span class="text-[11px] font-bold ${i === 0 ? "text-orange-400" : "text-stone-500"}">${dayName}</span>
      `;
      container.appendChild(dayCol);
    }
  }

  // Achievements Shelf on Dashboard
  async function renderAchievementsShelf() {
    const container = document.getElementById("dash-achievements-shelf");
    if (!container) return;

    try {
      const data = await CodeStreakAPI.getAchievements();
      container.innerHTML = "";

      const sample = data.achievements.slice(0, 4);
      sample.forEach(ach => {
        const item = document.createElement("div");
        item.className = `p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
          ach.unlocked 
            ? "bg-[#1c0f08] border-orange-500/50 text-stone-200 shadow-md shadow-orange-500/10" 
            : "bg-[#120804] border-orange-500/10 text-stone-500 opacity-60"
        }`;
        item.innerHTML = `
          <div class="text-2xl p-2 rounded-xl ${ach.unlocked ? "bg-orange-500/20 border border-orange-500/40" : "bg-[#180d07]"}">${ach.icon}</div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold truncate ${ach.unlocked ? "text-orange-300" : "text-stone-400"}">${ach.title}</h4>
            <p class="text-xs text-stone-400 truncate">${ach.description}</p>
          </div>
          ${ach.unlocked ? `<span class="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-black border border-orange-500/30">Earned</span>` : `<i data-lucide="lock" class="w-4 h-4 text-stone-600"></i>`}
        `;
        container.appendChild(item);
      });
      lucide.createIcons();
    } catch (e) {
      console.error(e);
    }
  }

  // Load and Render Subjects
  async function loadSubjects() {
    try {
      const data = await CodeStreakAPI.getSubjects();
      subjectsList = data.subjects || [];

      // Update total questions badge
      const countEl = document.getElementById("dash-total-questions-count");
      if (countEl) countEl.textContent = `${data.totalQuestions || 0} Questions`;

      // Render Subjects Grid in Dashboard
      const grid = document.getElementById("subjects-grid");
      if (!grid) return;
      grid.innerHTML = "";

      subjectsList.forEach(subj => {
        const card = document.createElement("div");
        card.className = "glass-panel-3d interactive-card-3d p-6 flex flex-col justify-between cursor-pointer group";
        
        let iconName = "cpu";
        if (subj.name.includes("Aptitude")) iconName = "calculator";
        else if (subj.name.includes("Reasoning")) iconName = "brain-circuit";
        else if (subj.name.includes("Verbal")) iconName = "book-open";
        else if (subj.name.includes("Digital")) iconName = "terminal";

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-orange flex items-center justify-center text-black shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                <i data-lucide="${iconName}" class="w-6 h-6"></i>
              </div>
              <span class="text-xs px-3 py-1 rounded-full bg-[#180d07] border border-orange-500/30 text-orange-300 font-black">
                ${subj.questionCount} Questions
              </span>
            </div>
            <h3 class="text-lg font-black text-white group-hover:text-orange-400 transition-colors">${subj.name}</h3>
            <p class="text-xs text-stone-400 mt-1 line-clamp-2">${subj.topics.slice(0, 3).join(" • ")}</p>
          </div>

          <div class="mt-5 pt-4 border-t border-orange-500/20 flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs text-stone-400">
              <span class="text-emerald-400 font-bold">${subj.difficulties?.Easy || 0}E</span> •
              <span class="text-amber-400 font-bold">${subj.difficulties?.Medium || 0}M</span> •
              <span class="text-rose-400 font-bold">${subj.difficulties?.Hard || 0}H</span>
            </div>
            <button class="px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-black text-xs font-black transition-all flex items-center gap-1 border border-orange-500/40">
              Battle <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
            </button>
          </div>
        `;

        card.addEventListener("click", () => {
          startNewGame({ subject: subj.name, mode: "quick", count: configuredMatchLength });
        });

        grid.appendChild(card);
      });

      // Populate Subject Filter in Arena Header
      const subjSelect = document.getElementById("arena-subject-select");
      if (subjSelect) {
        subjSelect.innerHTML = `<option value="All">All Subjects</option>`;
        subjectsList.forEach(s => {
          subjSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
      }

      lucide.createIcons();
    } catch (e) {
      console.error("Load subjects failed", e);
    }
  }

  // Start New Game Session
  async function startNewGame({ subject = "All", difficulty = "All", mode = "quick", count = 5 }) {
    try {
      const session = await window.gameEngine.startSession({ subject, difficulty, mode, count });
      switchView("arena");
      renderQuestionHUD(session);
      renderCurrentQuestion(session);
    } catch (err) {
      alert(err.message || "Could not start session.");
    }
  }

  // Render Stage Progression Battle Map
  function renderStageMap(session) {
    const mapContainer = document.getElementById("arena-stage-map");
    if (!mapContainer || !session) return;
    mapContainer.innerHTML = "";

    const totalStages = Math.min(6, session.totalQuestions);
    const stepSize = Math.max(1, Math.floor(session.totalQuestions / totalStages));
    const currentStage = Math.min(totalStages - 1, Math.floor(session.currentIndex / stepSize));

    document.getElementById("arena-stage-title").textContent = `Stage ${currentStage + 1} of ${totalStages} — Combat Arena`;

    for (let i = 0; i < totalStages; i++) {
      const isCurrent = i === currentStage;
      const isPassed = i < currentStage;

      const node = document.createElement("div");
      node.className = `stage-node ${isCurrent ? "current" : (isPassed ? "passed" : "")}`;
      node.textContent = i === totalStages - 1 ? "👑" : (i + 1);
      node.title = `Stage ${i + 1}`;
      mapContainer.appendChild(node);

      if (i < totalStages - 1) {
        const line = document.createElement("div");
        line.className = `stage-line ${isPassed ? "active" : ""}`;
        mapContainer.appendChild(line);
      }
    }
  }

  // Render HUD
  function renderQuestionHUD(session) {
    if (!session) return;
    const q = window.gameEngine.getCurrentQuestion();
    if (!q) return;

    renderStageMap(session);

    document.getElementById("hud-subject-tag").textContent = q.subject || session.subject || "General";
    document.getElementById("hud-topic-tag").textContent = q.topic || "Core Knowledge";
    
    // Difficulty pill
    const diffPill = document.getElementById("hud-diff-pill");
    const diff = q.difficulty || "Medium";
    diffPill.textContent = diff;
    if (diff === "Easy") {
      diffPill.className = "px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    } else if (diff === "Hard") {
      diffPill.className = "px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40";
    } else {
      diffPill.className = "px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40";
    }

    // Dynamic Combo Multiplier
    const comboText = document.getElementById("hud-combo-text");
    if (session.comboMultiplier > 1.0) {
      comboText.textContent = `${session.comboMultiplier}x COMBO 🔥`;
      document.getElementById("hud-combo-badge").className = "px-2.5 py-1 rounded-xl bg-orange-500 text-black text-xs font-black flex items-center gap-1 shadow-lg shadow-orange-500/40 animate-pulse";
    } else {
      comboText.textContent = `1.0x NORMAL`;
      document.getElementById("hud-combo-badge").className = "px-2.5 py-1 rounded-xl bg-[#1e1008] text-stone-400 text-xs font-black flex items-center gap-1 border border-orange-500/20";
    }

    // Question number
    document.getElementById("hud-qnum").textContent = `Q ${session.currentIndex + 1}/${session.totalQuestions}`;

    // Survival hearts
    const survivalBox = document.getElementById("hud-survival-box");
    if (session.mode === "survival") {
      survivalBox.classList.remove("hidden");
      const heartsContainer = document.getElementById("hud-hearts-container");
      heartsContainer.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement("span");
        heart.className = `text-xl transition-all ${i < session.livesRemaining ? "text-rose-500 scale-100" : "text-stone-700 scale-75 opacity-30"}`;
        heart.textContent = "❤️";
        heartsContainer.appendChild(heart);
      }
    } else {
      survivalBox.classList.add("hidden");
    }

    // Time Attack Timer
    const timerBox = document.getElementById("hud-timer-box");
    if (session.mode === "time_attack") {
      timerBox.classList.remove("hidden");
      document.getElementById("hud-timer-text").textContent = `${session.timeLeft}s`;
    } else {
      timerBox.classList.add("hidden");
    }

    // Boss Bar
    const bossBox = document.getElementById("hud-boss-box");
    if (session.mode === "boss") {
      bossBox.classList.remove("hidden");
      const bossBar = document.getElementById("hud-boss-health");
      const pct = Math.max(0, session.bossHp);
      bossBar.style.width = `${pct}%`;
      document.getElementById("hud-boss-text").textContent = `Boss HP: ${pct}%`;
    } else {
      bossBox.classList.add("hidden");
    }

    // Update Power-up counts
    document.getElementById("count-5050").textContent = session.powerUps?.fiftyFifty || 0;
    document.getElementById("count-stasis").textContent = session.powerUps?.timeStasis || 0;
    document.getElementById("count-oracle").textContent = session.powerUps?.oracle || 0;

    document.getElementById("btn-powerup-5050").disabled = (session.powerUps?.fiftyFifty <= 0 || session.isAnswerSubmitted);
    document.getElementById("btn-powerup-stasis").disabled = (session.powerUps?.timeStasis <= 0 || session.mode !== "time_attack");
    document.getElementById("btn-powerup-oracle").disabled = (session.powerUps?.oracle <= 0);
  }

  // Render Current Question
  function renderCurrentQuestion(session) {
    const q = window.gameEngine.getCurrentQuestion();
    if (!q) return;

    // Reset controls
    const submitBtn = document.getElementById("arena-submit-btn");
    const nextBtn = document.getElementById("arena-next-btn");
    const explanationCard = document.getElementById("arena-explanation-card");
    const hintCard = document.getElementById("arena-hint-box");

    submitBtn.classList.remove("hidden");
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-40", "cursor-not-allowed");
    nextBtn.classList.add("hidden");
    explanationCard.classList.add("hidden");
    hintCard.classList.add("hidden");

    // Render Question Text
    document.getElementById("arena-question-text").textContent = q.questionText;

    // Render Options
    const optionsContainer = document.getElementById("arena-options-container");
    optionsContainer.innerHTML = "";

    const keyLabels = ["A", "B", "C", "D", "E", "F"];

    q.options.forEach((optText, idx) => {
      const optBtn = document.createElement("button");
      optBtn.className = "option-card-3d w-full p-4 flex items-center justify-between text-left group";
      optBtn.dataset.index = idx;

      optBtn.innerHTML = `
        <div class="flex items-center gap-3.5 flex-1 pr-2">
          <span class="w-8 h-8 rounded-xl bg-[#1b0e07] border border-orange-500/40 flex items-center justify-center text-xs font-black text-orange-400 group-hover:bg-orange-500 group-hover:text-black transition-colors shadow-sm">
            ${keyLabels[idx] || (idx + 1)}
          </span>
          <span class="text-sm md:text-base font-medium text-stone-200 group-hover:text-white transition-colors leading-relaxed">
            ${optText}
          </span>
        </div>
        <span class="text-[10px] font-mono text-stone-500 hidden sm:inline-block border border-orange-500/20 px-2 py-0.5 rounded bg-black/40">[${idx + 1}]</span>
      `;

      optBtn.addEventListener("click", () => {
        if (session.isAnswerSubmitted) return;
        window.gameEngine.selectAnswer(idx);
        document.querySelectorAll(".option-card-3d").forEach(el => el.classList.remove("selected"));
        optBtn.classList.add("selected");
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-40", "cursor-not-allowed");
      });

      optionsContainer.appendChild(optBtn);
    });
  }

  // Power-Up Click Handlers
  document.getElementById("btn-powerup-5050").addEventListener("click", () => {
    window.gameEngine.use5050();
  });

  document.getElementById("btn-powerup-stasis").addEventListener("click", () => {
    window.gameEngine.useTimeStasis();
  });

  document.getElementById("btn-powerup-oracle").addEventListener("click", () => {
    window.gameEngine.useOracle();
  });

  window.gameEngine.onPowerUpUsed = ({ type, eliminated }) => {
    if (type === "fiftyFifty" && eliminated) {
      eliminated.forEach(idx => {
        const card = document.querySelector(`.option-card-3d[data-index="${idx}"]`);
        if (card) card.classList.add("eliminated");
      });
      showFloater("⚡ 50:50 Strike!", "text-orange-400");
    } else if (type === "timeStasis") {
      showFloater("+15s Time Stasis!", "text-amber-400");
    } else if (type === "oracle") {
      const q = window.gameEngine.getCurrentQuestion();
      const hintCard = document.getElementById("arena-hint-box");
      hintCard.classList.remove("hidden");
      document.getElementById("arena-hint-text").textContent = q.hint || "Focus on the core concept and eliminate impossible options.";
      showFloater("💡 Oracle Insight!", "text-yellow-400");
    }
  };

  // Submit Answer Action
  document.getElementById("arena-submit-btn").addEventListener("click", async () => {
    const session = window.gameEngine.session;
    if (!session || session.selectedAnswer === null || session.isAnswerSubmitted) return;

    try {
      const validation = await window.gameEngine.submitAnswer();
      if (!validation) return;

      // Reveal Option Statuses
      const optionCards = document.querySelectorAll(".option-card-3d");
      optionCards.forEach(card => {
        const idx = parseInt(card.dataset.index);
        card.classList.remove("selected");
        if (idx === validation.correctAnswerIndex) {
          card.classList.add("correct");
        } else if (idx === session.selectedAnswer && !validation.isCorrect) {
          card.classList.add("incorrect");
        }
      });

      // Show floating XP if correct
      if (validation.isCorrect) {
        showFloater(`+${Math.round(validation.xpEarned * session.comboMultiplier)} XP`, "text-orange-400");
      }

      // Show Explanation Card
      const expCard = document.getElementById("arena-explanation-card");
      expCard.classList.remove("hidden");
      const expTitle = document.getElementById("arena-exp-title");
      const expText = document.getElementById("arena-exp-text");

      if (validation.isCorrect) {
        expTitle.textContent = "🎯 Direct Hit! Correct Solution.";
        expTitle.className = "text-sm font-black text-emerald-400 flex items-center gap-2";
      } else {
        expTitle.textContent = `❌ Missed Target! Answer: ${validation.correctAnswerText}`;
        expTitle.className = "text-sm font-black text-rose-400 flex items-center gap-2";
      }
      expText.textContent = validation.explanation;

      // Toggle Submit -> Next button
      document.getElementById("arena-submit-btn").classList.add("hidden");
      const nextBtn = document.getElementById("arena-next-btn");
      nextBtn.classList.remove("hidden");
      nextBtn.focus();

      // Check if last question or game over
      if (session.currentIndex >= session.totalQuestions - 1 || 
         (session.mode === "survival" && session.livesRemaining <= 0)) {
        nextBtn.innerHTML = `Victory Screen <i data-lucide="award" class="w-4 h-4 ml-1"></i>`;
      } else {
        nextBtn.innerHTML = `Next Stage <i data-lucide="arrow-right" class="w-4 h-4 ml-1"></i>`;
      }
      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  });

  // Next Question Action
  document.getElementById("arena-next-btn").addEventListener("click", () => {
    window.gameEngine.nextQuestion();
    renderCurrentQuestion(window.gameEngine.session);
  });

  // Floating score tag animation
  function showFloater(text, colorClass) {
    const el = document.createElement("div");
    el.className = `xp-float ${colorClass}`;
    el.textContent = text;
    el.style.left = "50%";
    el.style.top = "42%";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // Handle Session State Changes
  window.gameEngine.onStateChange = (session) => {
    renderQuestionHUD(session);
  };

  // Timer Tick
  window.gameEngine.onTimerTick = (seconds) => {
    const textEl = document.getElementById("hud-timer-text");
    if (textEl) {
      textEl.textContent = `${seconds}s`;
      if (seconds <= 10) {
        textEl.className = "text-sm font-black text-rose-500 animate-pulse";
      } else {
        textEl.className = "text-sm font-black text-amber-400";
      }
    }
  };

  // Session Finished Handler
  window.gameEngine.onSessionFinished = async ({ session, result }) => {
    switchView("results");
    triggerConfetti();

    // Populate Results View
    document.getElementById("res-score").textContent = session.score;
    document.getElementById("res-xp").textContent = `+${session.totalXpEarned} XP`;
    document.getElementById("res-coins").textContent = `+${session.totalCoinsEarned}`;
    document.getElementById("res-accuracy").textContent = `${Math.round((session.correctCount / session.totalQuestions) * 100)}%`;
    document.getElementById("res-breakdown").textContent = `${session.correctCount} / ${session.totalQuestions} Questions Cleared`;

    // Mode title
    document.getElementById("res-mode-badge").textContent = `${session.mode.toUpperCase().replace("_", " ")} BATTLE`;

    // Leveled Up Banner
    const lvlBanner = document.getElementById("res-level-up-banner");
    if (result.leveledUp) {
      lvlBanner.classList.remove("hidden");
      document.getElementById("res-new-level-text").textContent = `Rank ${result.newLevel} Reached!`;
    } else {
      lvlBanner.classList.add("hidden");
    }

    // Refresh profile header
    await refreshProfile();
  };

  // Replay Actions on Results Screen
  document.getElementById("btn-replay-same").addEventListener("click", () => {
    const prev = window.gameEngine.session;
    startNewGame({
      subject: prev.subject,
      difficulty: prev.difficulty,
      mode: prev.mode,
      count: prev.totalQuestions
    });
  });

  document.getElementById("btn-try-harder").addEventListener("click", () => {
    const prev = window.gameEngine.session;
    startNewGame({
      subject: prev.subject,
      difficulty: "Hard",
      mode: prev.mode,
      count: configuredMatchLength
    });
  });

  document.getElementById("btn-review-mistakes").addEventListener("click", () => {
    startNewGame({ mode: "review_mistakes", count: 10 });
  });

  document.getElementById("btn-return-dashboard").addEventListener("click", () => {
    switchView("dashboard");
    refreshProfile();
  });

  // Game Mode Quick Start Buttons from Dashboard
  document.querySelectorAll("[data-gamemode]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.gamemode;
      if (mode === "boss") {
        if ((currentProfile?.level || 1) < 2) {
          alert("The Boss Titan unlocks at Player Level 2! Earn XP by clearing challenges.");
          return;
        }
        startNewGame({ mode: "boss", count: 10 });
      } else if (mode === "review_mistakes") {
        if (!currentProfile?.mistakeQuestionIds || currentProfile.mistakeQuestionIds.length === 0) {
          alert("You have no questions in your mistake queue! Keep battling in the arena.");
          return;
        }
        startNewGame({ mode: "review_mistakes", count: 10 });
      } else {
        startNewGame({ mode, count: mode === "time_attack" ? 15 : configuredMatchLength });
      }
    });
  });

  // Daily Challenge Banner Button
  const dailyBtn = document.getElementById("dash-play-daily-btn");
  if (dailyBtn) {
    dailyBtn.addEventListener("click", () => {
      startNewGame({ mode: "daily", count: 5 });
    });
  }

  // Reward Store Purchasing
  async function setupStore() {
    const storeContainer = document.getElementById("store-items-grid");
    if (!storeContainer) return;

    storeContainer.addEventListener("click", async (e) => {
      const buyBtn = e.target.closest("[data-buy-item]");
      if (!buyBtn) return;
      const itemId = buyBtn.dataset.buyItem;
      try {
        const res = await CodeStreakAPI.buyStoreItem(itemId);
        alert(res.message);
        triggerConfetti();
        window.soundEngine.playLevelUp();
        refreshProfile();
      } catch (err) {
        alert(err.message || "Purchase failed.");
      }
    });
  }

  // Achievements View Render
  async function renderFullAchievementsView() {
    const container = document.getElementById("full-achievements-grid");
    if (!container) return;
    try {
      const data = await CodeStreakAPI.getAchievements();
      container.innerHTML = "";
      data.achievements.forEach(ach => {
        const card = document.createElement("div");
        card.className = `glass-panel-3d p-5 flex items-start gap-4 transition-all ${
          ach.unlocked 
            ? "border-orange-500/60 bg-orange-950/20 shadow-lg shadow-orange-500/10" 
            : "border-orange-500/10 bg-[#120804] opacity-70"
        }`;
        card.innerHTML = `
          <div class="text-4xl p-3 rounded-2xl ${ach.unlocked ? "bg-orange-500/20 border border-orange-500/40" : "bg-[#180d07] border border-orange-500/20"}">
            ${ach.icon}
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-black ${ach.unlocked ? "text-orange-300" : "text-stone-300"}">${ach.title}</h3>
              ${ach.unlocked 
                ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/40">Earned</span>`
                : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#180d07] text-stone-500">Locked</span>`
              }
            </div>
            <p class="text-xs text-stone-400 mt-1.5 leading-relaxed">${ach.description}</p>
            <div class="mt-3 flex items-center gap-3 text-xs font-black text-stone-400">
              <span class="text-orange-400">+${ach.rewardXp} XP</span> •
              <span class="text-amber-400">+${ach.rewardCoins} Coins</span>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
      lucide.createIcons();
    } catch (e) {
      console.error(e);
    }
  }

  // Upload Hub Handler
  const uploadForm = document.getElementById("question-upload-form");
  const fileInput = document.getElementById("question-file-input");
  const uploadStatus = document.getElementById("upload-status-box");

  if (uploadForm && fileInput) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!fileInput.files || fileInput.files.length === 0) {
        alert("Please select a JSON or CSV file to upload.");
        return;
      }
      const file = fileInput.files[0];
      uploadStatus.classList.remove("hidden");
      uploadStatus.innerHTML = `<span class="text-orange-400 animate-pulse font-black">Validating and uploading questions...</span>`;

      try {
        const res = await CodeStreakAPI.uploadQuestions(file);
        uploadStatus.innerHTML = `
          <div class="p-4 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm">
            <strong>Upload Successful!</strong> Imported <b>${res.questionsImported}</b> valid questions.
            Total questions now in arena: <b>${res.totalQuestionsNow}</b>.
          </div>
        `;
        triggerConfetti();
        loadSubjects();
      } catch (err) {
        uploadStatus.innerHTML = `
          <div class="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm">
            <strong>Upload Failed:</strong> ${err.message}
          </div>
        `;
      }
    });
  }

  // Keyboard Shortcuts Listener
  window.addEventListener("keydown", (e) => {
    if (currentView !== "arena") return;
    const session = window.gameEngine.session;
    if (!session) return;

    const key = e.key.toUpperCase();
    const optMap = { "1": 0, "A": 0, "2": 1, "B": 1, "3": 2, "C": 2, "4": 3, "D": 3 };

    if (!session.isAnswerSubmitted && optMap[key] !== undefined) {
      const idx = optMap[key];
      const cards = document.querySelectorAll(".option-card-3d");
      if (cards[idx]) {
        cards[idx].click();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (!session.isAnswerSubmitted) {
        const submitBtn = document.getElementById("arena-submit-btn");
        if (submitBtn && !submitBtn.disabled && !submitBtn.classList.contains("hidden")) {
          e.preventDefault();
          submitBtn.click();
        }
      } else {
        const nextBtn = document.getElementById("arena-next-btn");
        if (nextBtn && !nextBtn.classList.contains("hidden")) {
          e.preventDefault();
          nextBtn.click();
        }
      }
    }
  });

  // Profile Reset Button
  const resetBtn = document.getElementById("btn-reset-profile");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (confirm("Reset player progress, XP, coins, and streaks back to zero?")) {
        await CodeStreakAPI.resetProfile();
        await refreshProfile();
        alert("Progress reset to default.");
      }
    });
  }

  // Initial Load
  await refreshProfile();
  await loadSubjects();
  await setupStore();
  await renderFullAchievementsView();

  // Arena Subject Filter Change
  const arenaSelect = document.getElementById("arena-subject-select");
  if (arenaSelect) {
    arenaSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      startNewGame({ subject: val, mode: "quick", count: configuredMatchLength });
    });
  }
});
