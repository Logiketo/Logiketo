import { api } from './api'

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    firstName: string
    lastName: string
  }
  _count?: {
    orders: number
  }
}

export interface CreateCustomerData {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomersResponse {
  success: boolean
  data: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CustomerResponse {
  success: boolean
  data: Customer
  message?: string
}

export const customerService = {
  // Get all customers with pagination and search
  getCustomers: async (params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<CustomersResponse> => {
    const response = await api.get('/customers', { params })
    return response.data
  },

  // Get customer by ID
  getCustomer: async (id: string): Promise<CustomerResponse> => {
    const response = await api.get(`/customers/${id}`)
    return response.data
  },

  // Create new customer
  createCustomer: async (data: CreateCustomerData): Promise<CustomerResponse> => {
    const response = await api.post('/customers', data)
    return response.data
  },

  // Update customer
  updateCustomer: async (id: string, data: UpdateCustomerData): Promise<CustomerResponse> => {
    const response = await api.put(`/customers/${id}`, data)
    return response.data
  },

  // Delete customer
  deleteCustomer: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/customers/${id}`)
    return response.data
  }
}
