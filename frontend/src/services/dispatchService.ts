import { api } from './api'
import { Order, OrderStatus, Vehicle, Employee } from '@/types'

export interface DispatchDashboard {
  pendingOrders: Order[]
  activeOrders: Order[]
  availableVehicles: Vehicle[]
  availableDrivers: Employee[]
  recentDispatches: Order[]
  stats: {
    pendingCount: number
    activeCount: number
    availableVehiclesCount: number
    availableDriversCount: number
  }
}

export interface AssignOrderData {
  orderId: string
  vehicleId: string
  driverId: string
}

export interface UpdateDispatchStatusData {
  status: OrderStatus
  notes?: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
}

export interface OrderTracking {
  order: Order
  trackingEvents: Array<{
    id: string
    status: OrderStatus
    description: string
    location?: any
    timestamp: string
  }>
}

export const dispatchService = {
  async getDashboard(): Promise<DispatchDashboard> {
    const response = await api.get('/dispatch/dashboard')
    return response.data.data
  },

  async assignOrder(data: AssignOrderData): Promise<Order> {
    const response = await api.post('/dispatch/assign', data)
    return response.data.data
  },

  async updateDispatchStatus(orderId: string, data: UpdateDispatchStatusData): Promise<Order> {
    const response = await api.patch(`/dispatch/${orderId}/status`, data)
    return response.data.data
  },

  async getOrderTracking(orderId: string): Promise<OrderTracking> {
    const response = await api.get(`/dispatch/track/${orderId}`)
    return response.data.data
  },

  async getAvailableVehicles(): Promise<Vehicle[]> {
    const response = await api.get('/dispatch/vehicles/available')
    return response.data.data
  },

  async getAvailableDrivers(): Promise<Employee[]> {
    const response = await api.get('/dispatch/drivers/available')
    return response.data.data
  }
}
