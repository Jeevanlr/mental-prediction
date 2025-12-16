import { API_BASE_URL } from '../utils/constants';

/**
 * API service object containing all backend communication methods
 */
export const api = {
  // ========================================
  // Authentication APIs
  // ========================================

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Response>} Fetch response
   */
  login: async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Important for session management
      });

      return response;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (userData) => {
    const formData = new FormData();
    Object.keys(userData).forEach(key => {
      formData.append(key, userData[key]);
    });

    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  },

  /**
   * Logout user
   */
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'GET',
      credentials: 'include'
    });

    return response;
  },

  // ========================================
  // Prediction APIs (use JSON instead of text)
  // ========================================

  /**
   * Predict symptoms and get AI description
   */
  predictSymptoms: async (symptoms) => {
    const response = await fetch(`${API_BASE_URL}/predict_symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(symptoms),
      credentials: 'include'
    });

    return response.json(); // ✅ Backend returns JSON
  },

  /**
   * Predict from text statement
   */
  predictText: async (statement) => {
    const formData = new FormData();
    formData.append('statement', statement);

    const response = await fetch(`${API_BASE_URL}/predict_text`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    return response.json(); // ✅ Backend returns JSON
  },

  /**
   * Predict emotion using webcam
   */
  predictEmotion: async () => {
    const response = await fetch(`${API_BASE_URL}/predict_emotion`, {
      method: 'POST',
      credentials: 'include'
    });

    return response.json(); // ✅ Backend returns JSON
  },

  /**
   * Predict multimodal (placeholder)
   */
  predictMultimodal: async (statement) => {
    const formData = new FormData();
    formData.append('statement', statement);

    const response = await fetch(`${API_BASE_URL}/predict_multimodal`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    return response.json(); // ✅ Backend returns JSON
  },

  // ========================================
  // Chatbot API
  // ========================================
  sendChatMessage: async (message) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      credentials: 'include'
    });

    return response.json();
  },

  // ========================================
  // Video Feed
  // ========================================
  getVideoFeedUrl: () => `${API_BASE_URL}/video_feed`,

  // ========================================
  // Utility Functions
  // ========================================
  parseHTMLResponse: (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc;
  },

  handleError: (error) => {
    console.error('API Error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred',
      error: error
    };
  }
};

// ========================================
// Alternative JSON API Methods (for flexibility)
// ========================================
export const jsonApi = {
  predictSymptomsJSON: async (symptoms) => {
    const response = await fetch(`${API_BASE_URL}/predict_symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(symptoms),
      credentials: 'include'
    });

    return response.json();
  },

  predictTextJSON: async (statement) => {
    const formData = new FormData();
    formData.append('statement', statement);

    const response = await fetch(`${API_BASE_URL}/predict_text`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    return response.json();
  },

  predictMultimodalJSON: async (statement) => {
    const formData = new FormData();
    formData.append('statement', statement);

    const response = await fetch(`${API_BASE_URL}/predict_multimodal`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    return response.json();
  }
};

export default api;
