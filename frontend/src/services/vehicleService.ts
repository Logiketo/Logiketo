import { api } from './api'

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin?: string
  color?: string
  capacity?: number
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
  isActive: boolean
  createdAt: string
  updatedAt: string
  driverId?: string
  driver?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    orders: number
  }
  // New fields for enhanced vehicle information
  unitNumber?: string
  driverName?: string
  dimensions?: string
  payload?: string
  registrationExpDate?: string
  insuranceExpDate?: string
  insuranceDocument?: string
  registrationDocument?: string
  documents?: Array<{
    name: string
    path: string
    uploadDate: string
  }>
}

export interface CreateVehicleData {
  make: string
  model: string
  year: number
  licensePlate: string
  vin?: string
  color?: string
  capacity?: number
  driverId?: string
  // New fields for enhanced vehicle information
  unitNumber?: string
  driverName?: string
  dimensions?: string
  payload?: string
  registrationExpDate?: string
  insuranceExpDate?: string
  insuranceDocument?: string
  registrationDocument?: string
  documents?: Array<{
    name: string
    path: string
    uploadDate: string
  }>
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VehiclesResponse {
  success: boolean
  data: Vehicle[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface VehicleResponse {
  success: boolean
  data: Vehicle
  message?: string
}

export const vehicleService = {
  // Get all vehicles with pagination and search
  getVehicles: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
  }): Promise<VehiclesResponse> => {
    const response = await api.get('/vehicles', { params })
    return response.data
  },

  // Get vehicle by ID
  getVehicle: async (id: string): Promise<VehicleResponse> => {
    const response = await api.get(`/vehicles/${id}`)
    return response.data
  },

  // Create new vehicle
  createVehicle: async (data: CreateVehicleData | FormData): Promise<VehicleResponse> => {
    const response = await api.post('/vehicles', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return response.data
  },

  // Update vehicle
  updateVehicle: async (id: string, data: UpdateVehicleData | FormData): Promise<VehicleResponse> => {
    const response = await api.put(`/vehicles/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return response.data
  },

  // Update vehicle status
  updateVehicleStatus: async (id: string, status: string): Promise<VehicleResponse> => {
    const response = await api.patch(`/vehicles/${id}/status`, { status })
    return response.data
  },

  // Delete vehicle
  deleteVehicle: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/vehicles/${id}`)
    return response.data
  },

  // Delete document from vehicle
  deleteDocument: async (vehicleId: string, documentIndex: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/vehicles/${vehicleId}/documents/${documentIndex}`)
    return response.data
  }
}
