export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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
}

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin?: string
  color?: string
  capacity?: number
  status: VehicleStatus
  isActive: boolean
  createdAt: string
  updatedAt: string
  driver?: User
}

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  vehicleId?: string
  driverId?: string
  pickupAddress: string
  deliveryAddress: string
  pickupDate: string
  deliveryDate?: string
  status: OrderStatus
  priority: Priority
  description?: string
  weight?: number
  volume?: number
  value?: number
  notes?: string
  createdAt: string
  updatedAt: string
  customer: Customer
  vehicle?: Vehicle
  driver?: User
}

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

export interface TrackingEvent {
  id: string
  orderId: string
  status: OrderStatus
  location?: string
  latitude?: number
  longitude?: number
  timestamp: string
  notes?: string
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
  USER = 'USER'
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE'
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
}

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