import { ReactNode, useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Truck, 
  LogOut, 
  ChevronDown, 
  Settings, 
  Menu, 
  X,
  Users,
  UserCheck,
  Package,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  Target
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { orderService } from '@/services/orderService'

interface MainLayoutProps {
  children: ReactNode
}

// Navigation configurations for different page types
const myFleetNavigation = [
  { name: 'Fleet', href: '/fleet', icon: Truck },
  { name: 'Employees', href: '/employees', icon: UserCheck },
  { name: 'Customers', href: '/customers', icon: Users },
]

const myDispatchNavigation = [
  { name: 'Units', href: '/units', icon: Package },
  { name: 'Map', href: '/map', icon: MapPin },
]

const ordersNavigation = [
  { name: 'Active', href: '/orders?status=ASSIGNED,IN_TRANSIT', icon: Package },
  { name: 'Delivered', href: '/orders?status=DELIVERED,CANCELLED', icon: CheckCircle },
  { name: 'Pending', href: '/orders?status=PENDING', icon: Clock },
]

const summaryNavigation = [
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'To Do', href: '/plans', icon: Target },
]

// Function to calculate order counts by status groups
const calculateOrderCounts = (orders: any[]) => {
  const counts = {
    active: 0,      // ASSIGNED + IN_TRANSIT
    delivered: 0,   // DELIVERED + CANCELLED
    pending: 0      // PENDING
  }
  
  orders.forEach(order => {
    switch (order.status) {
      case 'ASSIGNED':
      case 'IN_TRANSIT':
        counts.active++
        break
      case 'DELIVERED':
      case 'CANCELLED':
        counts.delivered++
        break
      case 'PENDING':
        counts.pending++
        break
    }
  })
  
  return counts
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Fetch all orders to calculate sidebar counts
  const { data: allOrdersData } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => orderService.getOrders({ page: 1, limit: 1000 }),
    enabled: location.pathname.startsWith('/orders')
  })

  // Calculate order counts for sidebar - updated to use dynamic counts
  const orderCounts = allOrdersData?.data ? calculateOrderCounts(allOrdersData.data) : { active: 0, delivered: 0, pending: 0 }

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const handleLogout = () => {
    logout()
  }

  // Determine which sidebar navigation to show based on current route
  const getSidebarNavigation = () => {
    if (location.pathname.startsWith('/myfleet') || location.pathname.startsWith('/fleet') || 
        location.pathname.startsWith('/employees') || location.pathname.startsWith('/customers')) {
      return myFleetNavigation
    } else if (location.pathname.startsWith('/dispatch') || location.pathname.startsWith('/units')) {
      return myDispatchNavigation
    } else if (location.pathname.startsWith('/orders')) {
      return ordersNavigation
    } else if (location.pathname.startsWith('/reports') || location.pathname.startsWith('/plans')) {
      return summaryNavigation
    }
    return []
  }

  const currentSidebarNav = getSidebarNavigation()
  const showSidebar = currentSidebarNav.length > 0

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setTimeout(() => {
          setIsUserDropdownOpen(false)
        }, 100)
      }
    }

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserDropdownOpen])

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Main Navigation Header - Always Visible */}
      <nav className="sticky top-0 z-50 border-b bg-gray-800 border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Far Left */}
            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <Truck className="h-8 w-8 text-blue-400 mr-3" />
              <span className="text-2xl font-bold tracking-wide">
                <span className="text-blue-600">Logi</span>
                <span className="text-teal-400">Keto</span>
              </span>
            </Link>
            
            {/* Center Navigation */}
            <div className="flex items-center space-x-8">
              <Link 
                to="/myfleet" 
                className={`text-white font-semibold transition-all duration-300 text-base px-4 py-2 rounded-lg ${
                  location.pathname.startsWith('/myfleet') || location.pathname.startsWith('/fleet') || 
                  location.pathname.startsWith('/employees') || location.pathname.startsWith('/customers')
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 hover:text-blue-300'
                }`}
              >
                MyFleet
              </Link>
              <Link 
                to="/dispatch" 
                className={`text-white font-semibold transition-all duration-300 text-base px-4 py-2 rounded-lg ${
                  location.pathname.startsWith('/dispatch') || location.pathname.startsWith('/units')
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 hover:text-blue-300'
                }`}
              >
                MyDispatch
              </Link>
              <Link 
                to="/orders" 
                className={`text-white font-semibold transition-all duration-300 text-base px-4 py-2 rounded-lg ${
                  location.pathname.startsWith('/orders')
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 hover:text-blue-300'
                }`}
              >
                Orders
              </Link>
              <Link 
                to="/reports" 
                className={`text-white font-semibold transition-all duration-300 text-base px-4 py-2 rounded-lg ${
                  location.pathname.startsWith('/reports')
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 hover:text-blue-300'
                }`}
              >
                Summary
              </Link>
            </div>
            
            {/* User Profile - Far Right */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="text-white hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-gray-700"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </button>
              <button
                onClick={toggleUserDropdown}
                className="flex items-center gap-x-3 text-sm text-white hover:text-blue-300 transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-700"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-blue-200 font-medium">{user?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-blue-300" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dropdown - Outside of nav structure */}
      {isUserDropdownOpen && (
        <div 
          className="fixed right-4 top-20 w-48 bg-white border border-gray-200 rounded-md shadow-xl z-[9999]"
          style={{ pointerEvents: 'auto' }}
          ref={dropdownRef}
        >
          <div 
            className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={() => {
              window.location.href = '/settings'
            }}
          >
            <Settings className="inline mr-3 h-4 w-4" />
            Settings
          </div>
          <div 
            className="px-4 py-3 text-sm text-gray-700 hover:bg-red-50 cursor-pointer"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={() => {
              handleLogout()
            }}
          >
            <LogOut className="inline mr-3 h-4 w-4" />
            Logout
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar - Only show if there's sidebar navigation */}
        {showSidebar && (
          <>
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
              <div className={`fixed inset-y-0 left-0 flex w-64 flex-col shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`flex h-16 items-center justify-between px-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <Link to="/dashboard" className={`flex items-center transition-colors rounded-md px-2 py-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <Truck className="h-8 w-8 text-primary-600" />
                    <span className={`ml-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Logiketo</span>
                  </Link>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Orders Summary Stats */}
                {location.pathname.startsWith('/orders') && (
                  <div className={`px-4 py-3 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-gray-200'}`}>
                    <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Order Summary</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-green-500 font-medium">Active:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-500 font-medium">Delivered:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.delivered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500 font-medium">Pending:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.pending}</span>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-1 space-y-1 px-2 py-4">
                  {currentSidebarNav.map((item) => {
                    const isActive = location.pathname + location.search === item.href
                    
                    // Special handling for Units - make it clickable to refresh
                    if (item.name === 'Units' && isActive) {
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            window.location.reload()
                            setSidebarOpen(false)
                          }}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left cursor-pointer ${
                            isDarkMode 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-primary-100 text-primary-900 hover:bg-primary-200'
                          }`}
                          title="Click to refresh the page"
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </button>
                      )
                    }
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-primary-100 text-primary-900'
                            : isDarkMode
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-30">
              <div className={`flex flex-col flex-grow border-r shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <Link to="/dashboard" className={`flex h-16 items-center px-4 transition-colors border-b ${isDarkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-100'}`}>
                  <Truck className="h-8 w-8 text-primary-600" />
                  <span className={`ml-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Logiketo</span>
                </Link>

                {/* Orders Summary Stats */}
                {location.pathname.startsWith('/orders') && (
                  <div className={`px-4 py-3 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-gray-200'}`}>
                    <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Order Summary</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-green-500 font-medium">Active:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-500 font-medium">Delivered:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.delivered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500 font-medium">Pending:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orderCounts.pending}</span>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-1 space-y-1 px-2 py-4">
                  {currentSidebarNav.map((item) => {
                    const isActive = location.pathname + location.search === item.href
                    
                    // Special handling for Units - make it clickable to refresh
                    if (item.name === 'Units' && isActive) {
                      return (
                        <button
                          key={item.name}
                          onClick={() => window.location.reload()}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left cursor-pointer ${
                            isDarkMode 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-primary-100 text-primary-900 hover:bg-primary-200'
                          }`}
                          title="Click to refresh the page"
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </button>
                      )
                    }
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-primary-100 text-primary-900'
                            : isDarkMode
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <div className={showSidebar ? "lg:pl-64 flex-1" : "flex-1"}>
          {/* Top navigation bar for pages with sidebar */}
          {showSidebar && (
            <div className={`sticky top-16 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <button
                type="button"
                className={`-m-2.5 p-2.5 lg:hidden ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1"></div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className={`${showSidebar ? "py-8" : ""} bg-gray-50 dark:bg-gray-900 min-h-screen`}>
            <div className={showSidebar ? "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" : ""}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
