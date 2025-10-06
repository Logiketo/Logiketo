// Google Maps Geocoding utilities

export interface GeocodingResult {
  address: string
  city: string
  state: string
  country: string
  coordinates: {
    lat: number
    lng: number
  }
}

export const geocodeZipCode = async (zipCode: string): Promise<GeocodingResult | null> => {
  try {
    // Wait for Google Maps to be loaded
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait
    
    while (!(window as any).google || !(window as any).google.maps) {
      if (attempts >= maxAttempts) {
        console.error('Google Maps API not loaded after waiting')
        return null
      }
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    const geocoder = new (window as any).google.maps.Geocoder()
    
    return new Promise((resolve, reject) => {
      geocoder.geocode(
        { 
          address: zipCode,
          componentRestrictions: {
            country: 'US' // Restrict to US for better results
          }
        },
        (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0]
            const addressComponents = result.address_components
            
            // Extract address components
            let city = ''
            let state = ''
            let country = ''
            
            addressComponents.forEach((component: any) => {
              const types = component.types
              if (types.includes('locality')) {
                city = component.long_name
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name
              } else if (types.includes('country')) {
                country = component.long_name
              }
            })
            
            const geocodingResult: GeocodingResult = {
              address: result.formatted_address,
              city,
              state,
              country,
              coordinates: {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng()
              }
            }
            
            resolve(geocodingResult)
          } else {
            console.error('Geocoding failed:', status)
            reject(new Error(`Geocoding failed: ${status}`))
          }
        }
      )
    })
  } catch (error) {
    console.error('Error in geocodeZipCode:', error)
    return null
  }
}

export const formatLocationFromGeocoding = (result: GeocodingResult): string => {
  const parts = []
  
  if (result.city) parts.push(result.city)
  if (result.state) parts.push(result.state)
  if (result.country) parts.push(result.country)
  
  return parts.join(', ')
}

export const isValidZipCode = (zipCode: string): boolean => {
  // US ZIP code validation (5 digits or 5+4 format)
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zipCode.trim())
}

export const getCoordinatesFromZipCode = async (zipCode: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const result = await geocodeZipCode(zipCode)
    if (result) {
      return result.coordinates
    }
    return null
  } catch (error) {
    console.error(`Error geocoding ${zipCode}:`, error)
    return null
  }
}
