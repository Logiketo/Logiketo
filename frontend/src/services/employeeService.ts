import { api } from './api'

export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position: string
  department?: string
  hireDate: string
  salary?: number
  status: EmployeeStatus
  address?: string
  emergencyContact?: string
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeData {
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position: string
  department?: string
  hireDate: string
  salary?: number
  address?: string
  emergencyContact?: string
  status?: EmployeeStatus
}

export interface UpdateEmployeeData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  position?: string
  department?: string
  hireDate?: string
  salary?: number
  address?: string
  emergencyContact?: string
  status?: EmployeeStatus
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE'
}

export const employeeService = {
  async getEmployees(params?: {
    page?: number
    limit?: number
    search?: string
    status?: EmployeeStatus
    department?: string
  }): Promise<PaginatedResponse<Employee>> {
    const response = await api.get('/employees', { params })
    return response.data
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const response = await api.get(`/employees/${id}`)
    return response.data.data
  },

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    const response = await api.post('/employees', data)
    return response.data.data
  },

  async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
    const response = await api.put(`/employees/${id}`, data)
    return response.data.data
  },

  async updateEmployeeStatus(id: string, status: EmployeeStatus): Promise<Employee> {
    const response = await api.patch(`/employees/${id}/status`, { status })
    return response.data.data
  },

  async deleteEmployee(id: string): Promise<void> {
    await api.delete(`/employees/${id}`)
  }
}
