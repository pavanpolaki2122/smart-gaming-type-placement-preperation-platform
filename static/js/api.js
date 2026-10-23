// API Client for CodeStreak with FastAPI REST endpoints & localStorage Sync

const API_BASE = window.location.origin;

const CodeStreakAPI = {
  async getProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      localStorage.setItem("codestreak_profile_cache", JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn("API offline or error, reading local cache", e);
      const cached = localStorage.getItem("codestreak_profile_cache");
      return cached ? JSON.parse(cached) : null;
    }
  },

  async resetProfile() {
    const res = await fetch(`${API_BASE}/api/profile/reset`, { method: "POST" });
    return await res.json();
  },

  async getSubjects() {
    const res = await fetch(`${API_BASE}/api/subjects`);
    if (!res.ok) throw new Error("Failed to fetch subjects");
    return await res.json();
  },

  async getQuestions(params = {}) {
    const query = new URLSearchParams();
    if (params.subject) query.append("subject", params.subject);
    if (params.difficulty) query.append("difficulty", params.difficulty);
    if (params.mode) query.append("mode", params.mode);
    if (params.count) query.append("count", params.count);
    query.append("shuffle_options", "true");

    const res = await fetch(`${API_BASE}/api/questions?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to load questions");
    }
    return await res.json();
  },

  async validateAnswer(payload) {
    // payload: { questionId, selectedAnswer, timeSpentSeconds, mode }
    const res = await fetch(`${API_BASE}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Validation request failed");
    return await res.json();
  },

  async finishSession(payload) {
    const res = await fetch(`${API_BASE}/api/session/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Finish session failed");
    return await res.json();
  },

  async buyStoreItem(itemId) {
    const res = await fetch(`${API_BASE}/api/store/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Purchase failed");
    }
    return await res.json();
  },

  async equipItem(params = {}) {
    const query = new URLSearchParams();
    if (params.theme) query.append("theme", params.theme);
    if (params.avatar) query.append("avatar", params.avatar);
    const res = await fetch(`${API_BASE}/api/profile/equip?${query.toString()}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to equip item");
    return await res.json();
  },

  async getAchievements() {
    const res = await fetch(`${API_BASE}/api/achievements`);
    if (!res.ok) throw new Error("Failed to fetch achievements");
    return await res.json();
  },

  async uploadQuestions(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/questions/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    return await res.json();
  }
};

window.CodeStreakAPI = CodeStreakAPI;
