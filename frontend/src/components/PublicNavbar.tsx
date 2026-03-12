import { Link, useLocation } from 'react-router-dom'
import { Truck } from 'lucide-react'

export default function PublicNavbar() {
  const location = useLocation()
  const isAbout = location.pathname === '/about'

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-blue-200 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl mr-3 shadow-lg">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-blue-800">Logi</span><span className="text-teal-600">Keto</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/about"
              className={`font-medium transition-all duration-200 ${
                isAbout
                  ? 'text-blue-600 font-semibold underline decoration-2 underline-offset-4'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              About
            </Link>
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
