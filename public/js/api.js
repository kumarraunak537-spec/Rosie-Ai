// public/js/api.js
// Client API layer with error resilience and offline handling

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[API] Error on ${endpoint}:`, error.message);
      throw error;
    }
  },

  async checkHealth() {
    return this.request('/api/health');
  },

  async sendMessage(message, sessionId = 'default') {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
  },

  async getChatHistory(sessionId = 'default') {
    return this.request(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
  },

  async clearChatHistory(sessionId = 'default') {
    return this.request(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  },

  async getMemories() {
    return this.request('/api/memories');
  },

  async addMemory(key, value, category = 'custom') {
    return this.request('/api/memories', {
      method: 'POST',
      body: JSON.stringify({ key, value, category })
    });
  },

  async updateMemory(id, key, value, category) {
    return this.request(`/api/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ key, value, category })
    });
  },

  async deleteMemory(id) {
    return this.request(`/api/memories/${id}`, {
      method: 'DELETE'
    });
  },

  async clearAllMemories() {
    return this.request('/api/memories', {
      method: 'DELETE'
    });
  },

  async login(identity, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identity, password })
    });
  },

  async getUserState() {
    return this.request('/api/user/state');
  },

  async updateUserState(updates) {
    return this.request('/api/user/state', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async subscribe(plan) {
    return this.request('/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
  }
};

window.API = API;
