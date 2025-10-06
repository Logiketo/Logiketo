import { api } from './api'

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  vehicleId?: string
  driverId?: string
  employeeId?: string // Employee who took the load
  customerLoadNumber?: string // Customer load#
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  description?: string
  miles?: number // Miles
  pieces?: number // Pieces
  weight?: number
  value?: number
  notes?: string
  document?: string // Document field
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  vehicle?: {
    id: string
    make: string
    model: string
    licensePlate: string
    unitNumber?: string
  }
  driver?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  trackingEvents?: TrackingEvent[]
}

export interface TrackingEvent {
  id: string
  orderId: string
  status: string
  location?: string
  latitude?: number
  longitude?: number
  timestamp: string
  notes?: string
}

export interface CreateOrderData {
  customerId: string
  vehicleId?: string
  driverId?: string
  employeeId?: string // Employee who took the load
  customerLoadNumber?: string // Customer load#
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  description?: string
  miles?: number // Miles
  pieces?: number // Pieces
  weight?: number
  value?: number
  notes?: string
  document?: string // Document field
}

export interface UpdateOrderData extends Partial<CreateOrderData> {}

export interface OrdersResponse {
  success: boolean
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface OrderResponse {
  success: boolean
  data: Order
  message?: string
}

export const orderService = {
  // Get all orders with pagination and search
  getOrders: async (params?: {
    page?: number
    limit?: number
    search?: string
    orderNumber?: string
    customerLoad?: string
    unitDriver?: string
    status?: string
    priority?: string
    customerId?: string
    vehicleId?: string
  }): Promise<OrdersResponse> => {
    const response = await api.get('/orders', { params })
    return response.data
  },

  // Get order by ID
  getOrder: async (id: string): Promise<OrderResponse> => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  // Create new order
  createOrder: async (data: CreateOrderData | FormData): Promise<OrderResponse> => {
    const response = await api.post('/orders', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return response.data
  },

  // Update order
  updateOrder: async (id: string, data: UpdateOrderData | FormData): Promise<OrderResponse> => {
    const response = await api.put(`/orders/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return response.data
  },

  // Update order status
  updateOrderStatus: async (id: string, status: string, location?: string, notes?: string): Promise<OrderResponse> => {
    const response = await api.patch(`/orders/${id}/status`, { status, location, notes })
    return response.data
  },

  // Delete order
  deleteOrder: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/orders/${id}`)
    return response.data
  },

  // Delete document from order
  deleteDocument: async (orderId: string, documentIndex: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/orders/${orderId}/documents/${documentIndex}`)
    return response.data
  }
}
