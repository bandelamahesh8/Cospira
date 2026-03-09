import { api } from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.token) {
      api.setToken(response.token);
    }
    return response;
  },

  async refreshSession(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken });
    if (response.token) {
      api.setToken(response.token);
    }
    return response;
  },

  async register(username, email, password) {
    return api.post('/auth/register', { username, email, password });
  },

  async logout() {
    // Clear token immediately
    api.setToken(null);
    return Promise.resolve();
  },

  async getProfile() {
    return api.get('/auth/me');
  },

  async updateProfile(userData) {
      return api.patch('/auth/me', userData);
  },

  async getLoginHistory() {
      // Server does not support this yet
      // return api.get('/auth/sessions');
      return Promise.resolve([]);
  },

  async checkUsernameAvailability(username) {
    return api.get(`/auth/check-username?username=${username}`);
  },

  async changePassword(currentPassword, newPassword) {
    return api.post('/auth/password/change', { currentPassword, newPassword });
  },

  async changeEmail(newEmail) {
    return api.post('/auth/email/change', { newEmail });
  },

  async requestOTP(email, purpose = 'forgot_login') {
      return api.post('/auth/otp/request', { email, purpose });
  },

  async verifyOTP(email, otp, purpose = 'forgot_login') {
      return api.post('/auth/otp/verify', { email, otp, purpose });
  },

  async resetPassword(resetToken, newPassword) {
      return api.post('/auth/password/reset', { resetToken, newPassword });
  }
};

