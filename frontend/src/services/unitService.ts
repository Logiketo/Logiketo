import { api } from './api'

export interface Unit {
  id: string
  vehicleId: string
  unitNumber: string
  name: string
  dimensions?: string
  payload?: string
  notes?: string
  availability?: string
  location?: string
  zipCode?: string
  availableTime?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
    driver?: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
  }
}

export interface CreateUnitData {
  vehicleId: string
  unitNumber: string
  name: string
  dimensions?: string
  payload?: string
  notes?: string
  availability?: string
  location?: string
  zipCode?: string
  availableTime?: string
}

export interface UpdateUnitData extends Partial<CreateUnitData> {}

export interface UnitsResponse {
  success: boolean
  data: Unit[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface UnitResponse {
  success: boolean
  data: Unit
  message?: string
}

export const unitService = {
  // Get all units with pagination and search
  getUnits: async (params?: {
    page?: number
    limit?: number
    search?: string
    availability?: string
  }): Promise<UnitsResponse> => {
    const response = await api.get('/units', { params })
    return response.data
  },

  // Get unit by ID
  getUnit: async (id: string): Promise<UnitResponse> => {
    const response = await api.get(`/units/${id}`)
    return response.data
  },

  // Create new unit
  createUnit: async (data: CreateUnitData): Promise<UnitResponse> => {
    const response = await api.post('/units', data)
    return response.data
  },

  // Update unit
  updateUnit: async (id: string, data: UpdateUnitData): Promise<UnitResponse> => {
    const response = await api.put(`/units/${id}`, data)
    return response.data
  },

  // Delete unit
  deleteUnit: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/units/${id}`)
    return response.data
  }
}
