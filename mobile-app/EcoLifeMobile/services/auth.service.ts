import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = "http://10.219.49.127:5500"; 

class AuthService {
  async register(username: string, email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, {
        username,
        email,
        password
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user_id', response.data.user_id.toString());
        await AsyncStorage.setItem('username', response.data.username);
      }
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { error: 'Registration failed' };
    }
  }

  async login(username: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username,
        password
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user_id', response.data.user_id.toString());
        await AsyncStorage.setItem('username', response.data.username);
      }
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { error: 'Login failed' };
    }
  }

  async logout() {
    await AsyncStorage.multiRemove(['token', 'user_id', 'username']);
  }

  async getToken() {
    return await AsyncStorage.getItem('token');
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