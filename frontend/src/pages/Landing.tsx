import { Link } from 'react-router-dom'
import { Truck, Package, Users, FileText, BarChart3, MapPin } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-blue-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl mr-3 shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold">
                <span className="text-blue-800">Logi</span><span className="text-teal-600">Keto</span>
              </span>
            </div>
            <Link 
              to="/login" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            New: Enhanced Dispatch Tools
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              Load Management & Dispatch Platform
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Add and save loads, manage dispatch operations, and track deliveries with our powerful logistics tools. Built for dispatchers who need efficient load management and mapping capabilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started
            </Link>
            <button className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 underline decoration-2 underline-offset-4 hover:decoration-blue-500">
              Watch demo
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Load Management */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Load Management</h3>
            <p className="text-gray-600 leading-relaxed">
              Add, save, and manage loads with detailed information including pickup, delivery, and payment details.
            </p>
          </div>

          {/* Dispatch Tools */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Truck className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Dispatch Tools</h3>
            <p className="text-gray-600 leading-relaxed">
              Powerful dispatch tools to assign loads to drivers and manage your fleet operations efficiently.
            </p>
          </div>

          {/* Interactive Maps */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <MapPin className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Interactive Maps</h3>
            <p className="text-gray-600 leading-relaxed">
              Visualize routes, track deliveries, and optimize dispatch with integrated mapping capabilities.
            </p>
          </div>

          {/* Load Tracking */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Load Tracking</h3>
            <p className="text-gray-600 leading-relaxed">
              Track load status from pickup to delivery with real-time updates and status management.
            </p>
          </div>

          {/* Fleet Management */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Fleet Management</h3>
            <p className="text-gray-600 leading-relaxed">
              Manage your drivers, vehicles, and units to ensure efficient load assignment and tracking.
            </p>
          </div>

          {/* Reports & Analytics */}
          <div className="group text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-blue-100 hover:bg-white hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-2">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reports & Analytics</h3>
            <p className="text-gray-600 leading-relaxed">
              Generate reports on loads, drivers, and performance to optimize your dispatch operations.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-blue-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl mr-3 shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold">
                <span className="text-blue-200">Logi</span><span className="text-teal-300">Keto</span>
              </span>
            </div>
            <p className="text-gray-300 mb-4">Streamlining logistics operations worldwide</p>
            <div className="border-t border-gray-700 pt-6">
              <p className="text-gray-400">&copy; 2024 Logiketo. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
