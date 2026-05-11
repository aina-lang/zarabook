export interface User {
  id: number | string;
  fullname: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: User;
  insert_id?: number;
}

const API_BASE_URL = 'https://romathproperties.com/wp-json/mobile/v1';

export const authService = {
  async register(fullname: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ fullname, email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Register API Error:', response.status, text);
        return { success: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Register Fetch Error:', error);
      return { success: false, message: error?.message || 'Network error' };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Login API Error:', response.status, text);
        return { success: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Login Fetch Error:', error);
      return { success: false, message: error?.message || 'Network error' };
    }
  },

  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Network error' };
    }
  },

  async resetPassword(email: string, otp: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, otp, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, message: `Server error: ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, message: error?.message || 'Network error' };
    }
  },
};
