import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import PublicNavbar from '@/components/PublicNavbar'
import api from '@/services/api'

const DEFAULT_ABOUT = {
  about_intro: 'LogiKeto is a load management and dispatch platform built for dispatchers who need efficient operations and real-time tracking.',
  about_p1: 'We streamline logistics with load management, dispatch tools, interactive maps, fleet management, and actionable reports. Our platform helps you add and save loads, assign drivers, track deliveries, and optimize your operations—all in one place.',
  about_p2: 'Logiketo was created by an experienced team with real hands-on knowledge of the dispatching and logistics industry. After years of working in the field, we saw the same challenges come up again and again—too many disconnected tools, too much manual work, scattered information, and unnecessary day-to-day chaos. Logiketo was built to solve those problems with a practical platform designed around real operational needs.',
  about_p3: 'Our goal was to bring the most important parts of a logistics business into one clear, easy-to-use system. Whether you are managing a small team or a growing fleet, Logiketo is designed to save time, keep operations organized, and help teams make faster, smarter decisions.',
  about_p4: ''
}

export default function About() {
  const { data: content = {} } = useQuery({
    queryKey: ['aboutContent'],
    queryFn: async () => {
      const res = await api.get('/content/about')
      return res.data.data || {}
    }
  })
  const intro = content.about_intro ?? DEFAULT_ABOUT.about_intro
  const p1 = content.about_p1 ?? DEFAULT_ABOUT.about_p1
  const p2 = content.about_p2 ?? DEFAULT_ABOUT.about_p2
  const p3 = content.about_p3 ?? DEFAULT_ABOUT.about_p3
  const p4 = content.about_p4 ?? DEFAULT_ABOUT.about_p4

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              About LogiKeto
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-6 leading-relaxed">{intro}</p>
          <p className="text-lg text-gray-600 leading-relaxed">{p1}</p>
          <p className="text-lg text-gray-600 leading-relaxed mt-6">{p2}</p>
          <p className="text-lg text-gray-600 leading-relaxed mt-6">{p3}</p>
          {p4 && <p className="text-lg text-gray-600 leading-relaxed mt-6">{p4}</p>}

          {/* Bottom CTAs */}
          <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://www.youtube.com/watch?v=fa_7S6gT0ZA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 underline decoration-2 underline-offset-4 hover:decoration-blue-500"
            >
              Watch Demo
            </a>
            <a
              href="mailto:sales@logiketo.com"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-blue-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center mb-6 hover:opacity-90 transition-opacity">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl mr-3 shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold">
                <span className="text-blue-200">Logi</span><span className="text-teal-300">Keto</span>
              </span>
            </Link>
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
