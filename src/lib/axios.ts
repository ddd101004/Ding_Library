import axios from 'axios';

// 创建axios实例
const instance = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 获取token的辅助函数 - 直接从localStorage获取，不依赖UserContext
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  }
  return null;
};

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 确保包含凭据
    config.withCredentials = true;
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);

    // 只在明确的服务端401错误时清除token
    if (error.response?.status === 401) {
      console.log('接收到401错误，清除token');
      // 清除所有可能的token存储
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('id');
        localStorage.removeItem('username');
        localStorage.removeItem('phone');
        
        // 避免重复重定向
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default instance;