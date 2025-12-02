import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';

class AuthService {
  async register(username: string, email: string, password: string) {
    return apiService.register(username, email, password);
  }

  async login(username: string, password: string) {
    return apiService.login(username, password);
  }

  async logout() {
    return apiService.logout();
  }

  async getProfile() {
    return apiService.getProfile();
  }

  async classifyWasteAdvanced(imageData: string, latitude?: number, longitude?: number) {
    return apiService.classifyWasteAdvanced(imageData, latitude, longitude);
  }

  async debugToken() {
    return apiService.debugToken();
  }

  async getToken() {
    return AsyncStorage.getItem('token');
  }

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  }

  async getCurrentUser() {
    const userId = await AsyncStorage.getItem('user_id');
    const username = await AsyncStorage.getItem('username');
    return { userId, username };
  }
}

export default new AuthService();