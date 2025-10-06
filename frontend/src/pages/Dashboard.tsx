const motivationQuotes = [
  "When the why is clear, the how is easy"
]

export default function Dashboard() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image - Truck Highway */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/truck-highway-bg.jpg')`
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 pt-32">
        {/* Large Logo */}
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold mb-6">
            <span className="text-blue-600">Logi</span>
            <span className="text-teal-400">Keto</span>
          </h1>
        </div>

        {/* Motivation Quote */}
        <div className="text-center max-w-4xl mb-16">
          <blockquote className="text-2xl md:text-3xl lg:text-4xl text-white font-medium leading-relaxed italic">
            <span className="text-4xl md:text-5xl text-blue-300 font-bold">"</span>
            <span className="px-2" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>{motivationQuotes[0]}</span>
            <span className="text-4xl md:text-5xl text-blue-300 font-bold">"</span>
          </blockquote>
        </div>

      </div>
    </div>
  )
}