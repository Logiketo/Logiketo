// Service for calculating distances using Google Maps API
export interface DistanceResult {
  distance: number // in miles
  duration?: number // in minutes
  error?: string
}

export class DistanceService {
  private static instance: DistanceService

  constructor() {
    // Don't initialize googleMaps here - check dynamically
  }

  private getGoogleMaps() {
    return (window as any).google?.maps
  }

  static getInstance(): DistanceService {
    if (!DistanceService.instance) {
      DistanceService.instance = new DistanceService()
    }
    return DistanceService.instance
  }

  // Convert zip code to coordinates using Google Maps Geocoding
  async getCoordinatesFromZipCode(zipCode: string): Promise<{ lat: number; lng: number } | null> {
    const googleMaps = this.getGoogleMaps()
    if (!googleMaps) {
      throw new Error('Google Maps not loaded')
    }

    return new Promise((resolve, reject) => {
      const geocoder = new googleMaps.Geocoder()
      
      geocoder.geocode({ address: zipCode }, (results: any[], status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng()
          })
        } else {
          reject(new Error(`Geocoding failed: ${status}`))
        }
      })
    })
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return Math.round(distance * 10) / 10 // Round to 1 decimal place
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Calculate distance between two zip codes
  async calculateDistanceBetweenZipCodes(zipCode1: string, zipCode2: string): Promise<DistanceResult> {
    try {
      const googleMaps = this.getGoogleMaps()
      if (!googleMaps) {
        return { distance: 0, error: 'Google Maps not loaded' }
      }

      const coords1 = await this.getCoordinatesFromZipCode(zipCode1)
      const coords2 = await this.getCoordinatesFromZipCode(zipCode2)

      if (!coords1 || !coords2) {
        return { distance: 0, error: 'Could not get coordinates for one or both zip codes' }
      }

      const distance = this.calculateDistance(
        coords1.lat, coords1.lng,
        coords2.lat, coords2.lng
      )

      return { distance }
    } catch (error) {
      return { 
        distance: 0, 
        error: error instanceof Error ? error.message : 'Unknown error calculating distance' 
      }
    }
  }

  // Get driving distance and duration using Google Maps Directions API
  async getDrivingDistance(zipCode1: string, zipCode2: string): Promise<DistanceResult> {
    const googleMaps = this.getGoogleMaps()
    if (!googleMaps) {
      return { distance: 0, error: 'Google Maps not loaded' }
    }

    return new Promise((resolve) => {
      const directionsService = new googleMaps.DirectionsService()
      
      directionsService.route({
        origin: zipCode1,
        destination: zipCode2,
        travelMode: googleMaps.TravelMode.DRIVING,
        unitSystem: googleMaps.UnitSystem.IMPERIAL
      }, (result: any, status: any) => {
        if (status === 'OK' && result.routes[0]) {
          const route = result.routes[0]
          const leg = route.legs[0]
          
          // Convert meters to miles
          const distanceInMiles = leg.distance.value * 0.000621371
          const durationInMinutes = leg.duration.value / 60
          
          resolve({
            distance: Math.round(distanceInMiles * 10) / 10,
            duration: Math.round(durationInMinutes)
          })
        } else {
          resolve({ 
            distance: 0, 
            error: `Directions failed: ${status}` 
          })
        }
      })
    })
  }
}

export const distanceService = DistanceService.getInstance()
