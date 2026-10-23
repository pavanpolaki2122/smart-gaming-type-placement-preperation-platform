// Game Engine for CodeStreak — The Learning Arena (Enhanced Game Mode & Power-Ups)

class GameEngine {
  constructor() {
    this.session = null;
    this.timerInterval = null;
    this.onStateChange = null;
    this.onQuestionAnswered = null;
    this.onSessionFinished = null;
    this.onTimerTick = null;
    this.onPowerUpUsed = null;
  }

  async startSession({ subject = "All", difficulty = "All", mode = "quick", count = 5 }) {
    this.clearTimer();

    // Fetch questions from API
    const data = await CodeStreakAPI.getQuestions({ subject, difficulty, mode, count });
    if (!data.questions || data.questions.length === 0) {
      throw new Error(data.message || "No questions found for the selected criteria.");
    }

    this.session = {
      mode,
      subject,
      difficulty,
      questions: data.questions,
      currentIndex: 0,
      totalQuestions: data.questions.length,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      lastValidation: null,
      score: 0,
      totalXpEarned: 0,
      totalCoinsEarned: 0,
      correctCount: 0,
      incorrectIds: [],
      startTime: Date.now(),
      questionStartTime: Date.now(),
      // Power-up Inventory for the match
      powerUps: {
        fiftyFifty: 1, // 1 per match
        timeStasis: 1, // 1 per match
        oracle: 2      // 2 per match
      },
      eliminatedIndices: [], // for 50-50
      shieldActive: false,
      // Mode-specific mechanics
      livesRemaining: mode === "survival" ? 3 : null,
      timeLeft: mode === "time_attack" ? 60 : null,
      bossHp: mode === "boss" ? 100 : null,
      bossMaxHp: mode === "boss" ? 100 : null,
      combo: 0,
      maxCombo: 0,
      comboMultiplier: 1.0
    };

    // Start timer if applicable
    if (this.session.mode === "time_attack") {
      this.startTimer();
    }

    this.notifyState();
    return this.session;
  }

  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      if (!this.session || this.session.timeLeft === null) return;
      this.session.timeLeft--;
      if (this.onTimerTick) this.onTimerTick(this.session.timeLeft);

      if (this.session.timeLeft <= 0) {
        this.clearTimer();
        this.finishSession();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ----------------- Tactical Power-Ups -----------------
  use5050() {
    if (!this.session || this.session.isAnswerSubmitted) return false;
    if (this.session.powerUps.fiftyFifty <= 0) return false;
    if (this.session.eliminatedIndices.length > 0) return false;

    const q = this.getCurrentQuestion();
    if (!q || !q.options || q.options.length <= 2) return false;

    // Identify wrong options to eliminate
    let wrongIndices = [];
    const targetIdx = q.correctAnswer !== undefined ? q.correctAnswer : 0;
    for (let i = 0; i < q.options.length; i++) {
      if (i !== targetIdx) wrongIndices.push(i);
    }
    // Pick 2 random wrong options to eliminate
    wrongIndices.sort(() => Math.random() - 0.5);
    this.session.eliminatedIndices = wrongIndices.slice(0, 2);
    this.session.powerUps.fiftyFifty--;

    window.soundEngine.playStreak();
    if (this.onPowerUpUsed) {
      this.onPowerUpUsed({ type: "fiftyFifty", eliminated: this.session.eliminatedIndices });
    }
    this.notifyState();
    return true;
  }

  useTimeStasis() {
    if (!this.session || this.session.timeLeft === null) return false;
    if (this.session.powerUps.timeStasis <= 0) return false;

    this.session.timeLeft += 15;
    this.session.powerUps.timeStasis--;
    window.soundEngine.playLevelUp();
    if (this.onPowerUpUsed) {
      this.onPowerUpUsed({ type: "timeStasis", bonusSeconds: 15 });
    }
    this.notifyState();
    return true;
  }

  useOracle() {
    if (!this.session) return false;
    if (this.session.powerUps.oracle <= 0) return false;

    this.session.powerUps.oracle--;
    window.soundEngine.playClick();
    if (this.onPowerUpUsed) {
      this.onPowerUpUsed({ type: "oracle" });
    }
    this.notifyState();
    return true;
  }

  selectAnswer(index) {
    if (!this.session || this.session.isAnswerSubmitted) return;
    if (this.session.eliminatedIndices.includes(index)) return; // blocked by 50:50
    this.session.selectedAnswer = index;
    window.soundEngine.playClick();
    this.notifyState();
  }

  async submitAnswer() {
    if (!this.session || this.session.isAnswerSubmitted) return null;
    if (this.session.selectedAnswer === null) return null;

    const currentQ = this.getCurrentQuestion();
    const timeSpent = (Date.now() - this.session.questionStartTime) / 1000;

    this.session.isAnswerSubmitted = true;

    // Validate on backend
    try {
      const validation = await CodeStreakAPI.validateAnswer({
        questionId: currentQ.questionId,
        selectedAnswer: this.session.selectedAnswer,
        timeSpentSeconds: timeSpent,
        mode: this.session.mode
      });

      this.session.lastValidation = validation;

      if (validation.isCorrect) {
        window.soundEngine.playCorrect();
        this.session.correctCount++;
        this.session.combo++;
        this.session.maxCombo = Math.max(this.session.maxCombo, this.session.combo);

        // Dynamic combo multiplier
        if (this.session.combo >= 4) {
          this.session.comboMultiplier = 3.0; // GODLIKE
        } else if (this.session.combo >= 3) {
          this.session.comboMultiplier = 2.0; // ULTRA
        } else if (this.session.combo >= 2) {
          this.session.comboMultiplier = 1.5; // HOT
        } else {
          this.session.comboMultiplier = 1.0;
        }

        const awardedXp = Math.round(validation.xpEarned * this.session.comboMultiplier);
        const awardedCoins = Math.round(validation.coinsEarned * this.session.comboMultiplier);

        this.session.totalXpEarned += awardedXp;
        this.session.totalCoinsEarned += awardedCoins;
        this.session.score += Math.round(validation.pointsEarned * this.session.comboMultiplier);

        // Boss damage
        if (this.session.mode === "boss" && this.session.bossHp !== null) {
          const dmg = Math.round(100 / this.session.totalQuestions);
          this.session.bossHp = Math.max(0, this.session.bossHp - dmg);
        }
      } else {
        window.soundEngine.playIncorrect();
        this.session.combo = 0;
        this.session.comboMultiplier = 1.0;
        this.session.incorrectIds.push(currentQ.questionId);

        // Survival mode heart loss
        if (this.session.mode === "survival" && this.session.livesRemaining !== null) {
          this.session.livesRemaining--;
        }
      }

      if (this.onQuestionAnswered) {
        this.onQuestionAnswered(validation, this.session);
      }

      this.notifyState();
      return validation;
    } catch (e) {
      console.error("Validation error", e);
      this.session.isAnswerSubmitted = false;
      throw e;
    }
  }

  nextQuestion() {
    if (!this.session) return;

    // Survival mode game over check
    if (this.session.mode === "survival" && this.session.livesRemaining <= 0) {
      this.finishSession();
      return;
    }

    if (this.session.currentIndex < this.session.totalQuestions - 1) {
      this.session.currentIndex++;
      this.session.selectedAnswer = null;
      this.session.isAnswerSubmitted = false;
      this.session.lastValidation = null;
      this.session.eliminatedIndices = []; // reset 50-50 for new question
      this.session.questionStartTime = Date.now();
      this.notifyState();
    } else {
      this.finishSession();
    }
  }

  async finishSession() {
    this.clearTimer();
    if (!this.session) return null;

    const payload = {
      mode: this.session.mode,
      subject: this.session.subject,
      totalQuestions: this.session.totalQuestions,
      correctAnswers: this.session.correctCount,
      score: this.session.score,
      xpEarned: this.session.totalXpEarned,
      coinsEarned: this.session.totalCoinsEarned,
      incorrectQuestionIds: this.session.incorrectIds,
      completed: true
    };

    try {
      const finishResult = await CodeStreakAPI.finishSession(payload);
      const summary = {
        session: { ...this.session },
        result: finishResult
      };

      if (finishResult.leveledUp) {
        window.soundEngine.playLevelUp();
      } else {
        window.soundEngine.playStreak();
      }

      if (this.onSessionFinished) {
        this.onSessionFinished(summary);
      }

      return summary;
    } catch (e) {
      console.error("Error finalizing session", e);
      throw e;
    }
  }

  getCurrentQuestion() {
    if (!this.session || !this.session.questions) return null;
    return this.session.questions[this.session.currentIndex];
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.session);
    }
  }
}

window.gameEngine = new GameEngine();
