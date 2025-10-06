import { useEffect, useState } from 'react'

// Global flag to prevent multiple Google Maps loads
let isGoogleMapsLoading = false
let isGoogleMapsLoaded = false

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      setError('Google Maps API key not found')
      return
    }

    // Check if Google Maps is already loaded globally
    if (isGoogleMapsLoaded || ((window as any).google && (window as any).google.maps)) {
      setIsLoaded(true)
      setIsLoading(false)
      isGoogleMapsLoaded = true
      return
    }

    // Check if Google Maps is already being loaded
    if (isGoogleMapsLoading) {
      // Wait for the existing load to complete
      const checkLoaded = () => {
        if (isGoogleMapsLoaded || ((window as any).google && (window as any).google.maps)) {
          setIsLoaded(true)
          setIsLoading(false)
          isGoogleMapsLoaded = true
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      setIsLoading(true)
      checkLoaded()
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = () => {
        if ((window as any).google && (window as any).google.maps) {
          setIsLoaded(true)
          setIsLoading(false)
          isGoogleMapsLoaded = true
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      setIsLoading(true)
      checkLoaded()
      return
    }

    // Start loading Google Maps
    isGoogleMapsLoading = true
    setIsLoading(true)

    // Load Google Maps script directly
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      console.log('✅ Google Maps loaded successfully!')
      setIsLoaded(true)
      setIsLoading(false)
      isGoogleMapsLoaded = true
      isGoogleMapsLoading = false
    }

    script.onerror = () => {
      console.log('❌ Failed to load Google Maps API')
      setError('Failed to load Google Maps API')
      setIsLoading(false)
      isGoogleMapsLoading = false
    }

    document.head.appendChild(script)

    return () => {
      // Don't remove the script on cleanup to prevent reloading
    }
  }, [])

  return { isLoaded, isLoading, error }
}
