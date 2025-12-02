import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = "http://10.219.49.127:5500";

class ApiService {
  private async makeRequest(url: string, options: any = {}) {
    const token = await AsyncStorage.getItem('token');
    
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Making request to:', url);
    console.log('Token exists:', !!token);
    console.log('Headers being sent:', headers);
    
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Request failed:', {
        url,
        status: response.status,
        data,
        headersSent: headers
      });
      throw data;
    }
    
    return data;
  }

  async register(username: string, email: string, password: string) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(username: string, password: string) {
    const result = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (result.token) {
      await AsyncStorage.setItem('token', result.token);
      await AsyncStorage.setItem('user_id', result.user_id.toString());
      await AsyncStorage.setItem('username', result.username);
    }
    
    return result;
  }

  async getProfile() {
    return this.makeRequest('/profile', {
      method: 'GET',
    });
  }

  async classifyWasteAdvanced(imageData: string, latitude?: number, longitude?: number) {
    const payload: any = { image: imageData };
    
    if (latitude !== undefined && longitude !== undefined) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }
    
    return this.makeRequest('/classify-waste/advanced', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async debugToken() {
    const token = await AsyncStorage.getItem('token');
    if (!token) return { valid: false };
    
    console.log('🔍 Testing token manually...');
    
    try {
      const response = await fetch(`${API_BASE}/debug-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Debug token result:', data);
      return data;
    } catch (error) {
      console.error('Debug token failed:', error);
      return { valid: false };
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

export default new ApiService();