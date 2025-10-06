import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  Users, 
  UserCheck, 
  Truck, 
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { reportService, ReportQuery } from '@/services/reportService'
import { format } from 'date-fns'

type ReportType = 'loads' | 'customers' | 'employees' | 'units' | 'new-units' | 'analytics'
type PeriodType = 'week' | 'month' | 'year' | '10year' | '100year' | 'custom'

export default function Reports() {
  const { isDarkMode } = useTheme()
  const [selectedReport, setSelectedReport] = useState<ReportType>('analytics')
  const [period, setPeriod] = useState<PeriodType>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)

  // Set default custom date range to last week
  useEffect(() => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    setCustomStartDate(startDate.toISOString().split('T')[0])
    setCustomEndDate(endDate.toISOString().split('T')[0])
  }, [])

  const reportQuery: ReportQuery = {
    period,
    ...(period === 'custom' && {
      startDate: customStartDate,
      endDate: customEndDate
    }),
    limit: 10
  }

  // Analytics query
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', reportQuery],
    queryFn: () => reportService.getAnalyticsReport(reportQuery),
    enabled: selectedReport === 'analytics'
  })

  // Loads query
  const { data: loadsData, isLoading: loadsLoading } = useQuery({
    queryKey: ['loads', reportQuery],
    queryFn: () => reportService.getLoadsReport(reportQuery),
    enabled: selectedReport === 'loads'
  })

  // Top customers query
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['top-customers', reportQuery],
    queryFn: () => reportService.getTopCustomersReport(reportQuery),
    enabled: selectedReport === 'customers'
  })

  // Top employees query
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['top-employees', reportQuery],
    queryFn: () => reportService.getTopEmployeesReport(reportQuery),
    enabled: selectedReport === 'employees'
  })

  // Top units query
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['top-units', reportQuery],
    queryFn: () => reportService.getTopUnitsReport(reportQuery),
    enabled: selectedReport === 'units'
  })

  // New items query
  const { data: newItemsData, isLoading: newItemsLoading } = useQuery({
    queryKey: ['new-items', reportQuery],
    queryFn: () => reportService.getNewItemsReport(reportQuery),
    enabled: selectedReport === 'new-units'
  })

  const isLoading = analyticsLoading || loadsLoading || customersLoading || employeesLoading || unitsLoading || newItemsLoading

  const reportTypes = [
    { id: 'analytics', name: 'Analytics Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'loads', name: 'Loads Report', icon: Package, color: 'text-green-600' },
    { id: 'customers', name: 'Customers', icon: Users, color: 'text-purple-600' },
    { id: 'employees', name: 'Employees', icon: UserCheck, color: 'text-orange-600' },
    { id: 'units', name: 'Units', icon: Truck, color: 'text-red-600' },
    { id: 'new-units', name: 'New', icon: MapPin, color: 'text-indigo-600' }
  ]

  const periods = [
    { id: 'week', name: 'Last Week' },
    { id: 'month', name: 'This Month' },
    { id: 'year', name: 'This Year' },
    { id: '10year', name: 'Last 10 Years' },
    { id: '100year', name: 'Last 100 Years' },
    { id: 'custom', name: 'Custom Range' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleExportReport = () => {
    // Get current report data
    let reportData = null
    let reportTitle = ''

    switch (selectedReport) {
      case 'analytics':
        reportData = analyticsData
        reportTitle = 'Analytics Overview'
        break
      case 'loads':
        reportData = loadsData
        reportTitle = 'Loads Report'
        break
      case 'customers':
        reportData = customersData
        reportTitle = 'Customers Report'
        break
      case 'employees':
        reportData = employeesData
        reportTitle = 'Employees Report'
        break
      case 'units':
        reportData = unitsData
        reportTitle = 'Units Report'
        break
      case 'new-units':
        reportData = newItemsData
        reportTitle = 'New Items Report'
        break
      default:
        return
    }

    if (!reportData) {
      alert('No data available to export')
      return
    }

    // Create CSV content
    let csvContent = ''
    
    if (selectedReport === 'analytics') {
      // Analytics overview - create summary CSV
      csvContent = `Metric,Value\n`
      csvContent += `Total Orders,${reportData.summary.totalOrders}\n`
      csvContent += `Total Revenue,${reportData.summary.totalRevenue}\n`
      csvContent += `Active Units,${reportData.summary.activeUnits}\n`
      csvContent += `Total Customers,${reportData.summary.totalCustomers}\n`
    } else if (selectedReport === 'loads') {
      // Loads report
      csvContent = `Date,Total Loads,Total Revenue,Average Load Value\n`
      reportData.dailyLoads.forEach(day => {
        csvContent += `${day.date},${day.totalLoads},${day.totalRevenue},${day.averageLoadValue}\n`
      })
    } else if (selectedReport === 'customers') {
      // Top customers
      csvContent = `Customer,Total Orders,Total Revenue,Average Order Value,Last Order Date\n`
      reportData.topCustomers.forEach(customer => {
        csvContent += `"${customer.name}",${customer.totalOrders},${customer.totalRevenue},${customer.averageOrderValue},"${customer.lastOrderDate || 'N/A'}"\n`
      })
    } else if (selectedReport === 'employees') {
      // Top employees
      csvContent = `Employee,Total Orders,Total Load Pay,Total Driver Pay,Delivered Orders,Last Order Date\n`
      reportData.topEmployees.forEach(employee => {
        csvContent += `"${employee.firstName} ${employee.lastName}",${employee.totalOrders},${employee.totalLoadPay},${employee.totalDriverPay},${employee.deliveredOrders},"${employee.lastOrderDate || 'N/A'}"\n`
      })
    } else if (selectedReport === 'units') {
      // Top units
      csvContent = `Unit,Vehicle,Total Orders,Total Miles,Total Load Pay\n`
      reportData.topUnits.forEach(unit => {
        csvContent += `"${unit.name}","${unit.vehicle}",${unit.totalOrders},${unit.totalMiles},${unit.totalLoadPay}\n`
      })
    } else if (selectedReport === 'new-units') {
      // New items summary
      csvContent = `Item Type,Count\n`
      csvContent += `New Units,${reportData.summary.totalNewUnits}\n`
      csvContent += `New Customers,${reportData.summary.totalNewCustomers}\n`
      csvContent += `New Employees,${reportData.summary.totalNewEmployees}\n`
      csvContent += `New Vehicles,${reportData.summary.totalNewVehicles}\n`
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename with current date and report type
    const currentDate = new Date().toISOString().split('T')[0]
    const periodText = period === 'custom' ? 'custom' : period
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${periodText}_${currentDate}.csv`
    
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Show success message
    alert(`Report exported successfully as ${filename}`)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const renderAnalyticsOverview = () => {
    if (!analyticsData) return null

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(analyticsData.overview.totalOrders)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.periodStats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.periodStats.netRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Period Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Orders in Period</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(analyticsData.periodStats.ordersInPeriod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Average Order Value</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.periodStats.averageOrderValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Driver Pay</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.periodStats.totalDriverPay)}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(analyticsData.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                    {status.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLoadsReport = () => {
    if (!loadsData) return null

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Loads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(loadsData.summary.totalQuantity)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Load Pay</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(loadsData.summary.totalLoadPay)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Driver Pay</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(loadsData.summary.totalDriverPay)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Miles</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(loadsData.summary.totalMiles)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loads Table */}
        <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Loads</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Load Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loadsData.loads.map((load) => (
                  <tr key={load.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {load.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {load.customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {load.loadPay ? formatCurrency(load.loadPay) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        load.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        load.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        load.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {load.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderTopCustomers = () => {
    if (!customersData) return null

    return (
      <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Customers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Load Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Average Load Pay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customersData.topCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(customer.totalOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(customer.deliveredOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCurrency(customer.totalLoadPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCurrency(customer.averageLoadPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderTopEmployees = () => {
    if (!employeesData) return null

    return (
      <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Employees</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Load Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Average Load Pay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {employeesData.topEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {employee.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(employee.totalOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCurrency(employee.totalLoadPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCurrency(employee.averageLoadPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderTopUnits = () => {
    if (!unitsData) return null

    return (
      <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Units</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Miles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Load Pay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {unitsData.topUnits.map((unit) => (
                <tr key={unit.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {unit.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        #{unit.unitNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {unit.vehicle}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        {unit.licensePlate}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(unit.totalOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(unit.totalMiles)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCurrency(unit.totalLoadPay)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderNewItems = () => {
    if (!newItemsData) return null

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">New Units</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(newItemsData.summary.totalNewUnits)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">New Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(newItemsData.summary.totalNewCustomers)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">New Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(newItemsData.summary.totalNewEmployees)}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Units Table */}
        <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Units</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {newItemsData.newUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {unit.unitNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {unit.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {unit.vehicle.make} {unit.vehicle.model} ({unit.vehicle.licensePlate})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {unit.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        unit.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {unit.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Customers Table */}
        {newItemsData.newCustomers.length > 0 && (
          <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Customers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Added Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {newItemsData.newCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {customer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Employees Table */}
        {newItemsData.newEmployees.length > 0 && (
          <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Employees</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Added Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {newItemsData.newEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            {employee.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {employee.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {employee.employeeId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {format(new Date(employee.createdAt), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'analytics':
        return renderAnalyticsOverview()
      case 'loads':
        return renderLoadsReport()
      case 'customers':
        return renderTopCustomers()
      case 'employees':
        return renderTopEmployees()
      case 'units':
        return renderTopUnits()
      case 'new-units':
        return renderNewItems()
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            View detailed reports and analytics for your logistics operations.
          </p>
        </div>
        <button 
          onClick={handleExportReport}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 border border-blue-500/20"
        >
          <Download className="h-5 w-5" />
          <span>Export Report</span>
          <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id as ReportType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedReport === report.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {report.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Period Selection */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {periods.map((periodOption) => (
              <button
                key={periodOption.id}
                onClick={() => {
                  setPeriod(periodOption.id as PeriodType)
                  setShowCustomDateRange(periodOption.id === 'custom')
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === periodOption.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {periodOption.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDateRange && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="card p-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading report data...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && renderReportContent()}
    </div>
  )
}
