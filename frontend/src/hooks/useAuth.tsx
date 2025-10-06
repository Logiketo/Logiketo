import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, LoginCredentials, RegisterData } from '@/types'
import { authApi } from '@/services/api'

interface AuthContextType {
  user: User | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authApi.getCurrentUser()
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials)
      const { user: userData, token } = response.data
      
      localStorage.setItem('token', token)
      setUser(userData)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data)
      const { user: userData, token } = response.data
      
      localStorage.setItem('token', token)
      setUser(userData)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
