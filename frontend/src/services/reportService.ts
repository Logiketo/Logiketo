import { api } from './api'

export interface ReportQuery {
  period?: 'week' | 'month' | 'year' | '10year' | '100year' | 'custom'
  startDate?: string
  endDate?: string
  limit?: number
}

export interface LoadsReport {
  period: string
  dateRange: {
    start: string
    end: string
  }
  summary: {
    totalQuantity: number
    totalLoadPay: number
    totalDriverPay: number
    totalMiles: number
    totalWeight: number
    averageLoadPay: number
    averageDriverPay: number
  }
  statusBreakdown: Record<string, number>
  loads: Array<{
    id: string
    orderNumber: string
    customer: {
      id: string
      name: string
    }
    driver?: {
      id: string
      firstName: string
      lastName: string
    }
    vehicle?: {
      id: string
      make: string
      model: string
      licensePlate: string
    }
    loadPay?: number
    driverPay?: number
    miles?: number
    weight?: number
    status: string
    createdAt: string
  }>
}

export interface TopCustomer {
  id: string
  name: string
  email?: string
  totalOrders: number
  deliveredOrders: number
  totalLoadPay: number
  totalDriverPay: number
  averageLoadPay: number
  lastOrderDate?: string
}

export interface TopEmployee {
  id: string
  employeeId: string
  name: string
  email: string
  position: string
  department?: string
  totalOrders: number
  deliveredOrders: number
  totalLoadPay: number
  totalDriverPay: number
  averageLoadPay: number
  lastOrderDate?: string
}

export interface TopUnit {
  id: string
  unitNumber: string
  name: string
  vehicle: string
  licensePlate: string
  totalOrders: number
  deliveredOrders: number
  totalLoadPay: number
  totalDriverPay: number
  totalMiles: number
  averageLoadPay: number
  lastOrderDate?: string
}

export interface NewUnit {
  id: string
  unitNumber: string
  name: string
  dimensions?: string
  payload?: string
  availability?: string
  location?: string
  zipCode?: string
  isActive: boolean
  createdAt: string
  vehicle: {
    id: string
    make: string
    model: string
    licensePlate: string
    year: number
    status: string
  }
}

export interface AnalyticsReport {
  period: string
  dateRange: {
    start: string
    end: string
  }
  overview: {
    totalOrders: number
    totalCustomers: number
    totalEmployees: number
    totalDrivers: number
    totalVehicles: number
    totalUnits: number
  }
  periodStats: {
    ordersInPeriod: number
    totalRevenue: number
    totalDriverPay: number
    netRevenue: number
    averageOrderValue: number
  }
  statusBreakdown: Record<string, number>
}

export const reportService = {
  // Get loads report
  getLoadsReport: async (query: ReportQuery = {}): Promise<LoadsReport> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/reports/loads?${params.toString()}`)
    return response.data.data
  },

  // Get top customers report
  getTopCustomersReport: async (query: ReportQuery = {}): Promise<{ period: string; dateRange: { start: string; end: string }; topCustomers: TopCustomer[] }> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/reports/top-customers?${params.toString()}`)
    return response.data.data
  },

  // Get top employees report
  getTopEmployeesReport: async (query: ReportQuery = {}): Promise<{ period: string; dateRange: { start: string; end: string }; topEmployees: TopEmployee[] }> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/reports/top-employees?${params.toString()}`)
    return response.data.data
  },

  // Get top units report
  getTopUnitsReport: async (query: ReportQuery = {}): Promise<{ period: string; dateRange: { start: string; end: string }; topUnits: TopUnit[] }> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/reports/top-units?${params.toString()}`)
    return response.data.data
  },

  // Get new items report
  getNewItemsReport: async (query: ReportQuery = {}): Promise<{ period: string; dateRange: { start: string; end: string }; summary: { totalNewUnits: number; totalNewCustomers: number; totalNewEmployees: number; totalNewVehicles: number; activeUnits: number; totalUnits: number; inactiveUnits: number }; newUnits: NewUnit[]; newCustomers: any[]; newEmployees: any[]; newVehicles: any[] }> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/reports/new-items?${params.toString()}`)
    return response.data.data
  },

  // Get comprehensive analytics
  getAnalyticsReport: async (query: ReportQuery = {}): Promise<AnalyticsReport> => {
    const params = new URLSearchParams()
    if (query.period) params.append('period', query.period)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)

    const response = await api.get(`/reports/analytics?${params.toString()}`)
    return response.data.data
  }
}
