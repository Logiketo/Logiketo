import axios from 'axios'
import { LoginCredentials, RegisterData, User, ApiResponse } from '@/types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://logiketo-production.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
}

// Helper function to get file URL
export const getFileUrl = (filePath: string): string => {
  if (!filePath) return ''
  // If it's already a full URL, return it
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  // Get base URL without /api suffix (files are served at root level, not under /api)
  let baseUrl = API_BASE_URL
  // Remove trailing /api if present
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4)
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.slice(0, -5)
  }
  // Remove trailing slash from baseUrl
  baseUrl = baseUrl.replace(/\/$/, '')
  // Remove leading slash from filePath if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `${baseUrl}/uploads/${cleanPath}`
}

export { api }
export default api
