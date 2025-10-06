import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { dispatchService } from '@/services/dispatchService'
import { unitService } from '@/services/unitService'
import { distanceService } from '@/services/distanceService'
import { getCoordinatesFromZipCode } from '@/utils/geocoding'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { useTheme } from '@/contexts/ThemeContext'
import GoogleMap from '@/components/GoogleMap'

export default function Dispatch() {
  const [unitMarkers, setUnitMarkers] = useState<any[]>([])
  const [isLoadingUnits, setIsLoadingUnits] = useState(false)
  const [zipCodeFilter, setZipCodeFilter] = useState('')
  const [milesRadius, setMilesRadius] = useState('150')
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(null)
  
  const { isLoaded: googleMapsLoaded } = useGoogleMaps()
  const { isDarkMode } = useTheme()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dispatchDashboard'],
    queryFn: dispatchService.getDashboard,
    refetchInterval: 30000 // Refresh every 30 seconds
  })


  // Apply distance calculation and zoom to pickup location
  const applyDistanceFilter = async () => {
    if (zipCodeFilter && milesRadius && unitsData?.data) {
      // Get pickup coordinates for zooming
      try {
        const pickupCoords = await getCoordinatesFromZipCode(zipCodeFilter)
        if (pickupCoords) {
          // Store pickup coordinates for map centering
          setPickupCoordinates(pickupCoords)
        }
      } catch (error) {
        console.error('Error getting pickup coordinates:', error)
      }
      
      // Recalculate markers with distances
      await recalculateMarkersWithDistances()
    } else {
      setPickupCoordinates(null)
    }
  }

  // Fetch units data - temporarily get ALL units to debug
  const { data: unitsData } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitService.getUnits({
      page: 1,
      limit: 100,
      availability: '' // Get ALL units to see what availability values exist
    })
  })

  // Process units and create markers - only when units data changes
  useEffect(() => {
    console.log('🚀 useEffect triggered with unitsData:', unitsData)
    const processUnits = async () => {
      console.log('🔄 Processing units...', unitsData)
      
      if (!unitsData?.data) {
        console.log('❌ No units data available')
        return
      }

      // Always use all units initially, don't filter here
      const unitsToProcess = unitsData.data

      console.log(`📊 Found ${unitsToProcess.length} units to process`)
      console.log('📋 Units data structure:', unitsToProcess)
      
      // Summary of units
      const availableUnits = unitsToProcess.filter(unit => 
        unit.availability === 'AVAILABLE' || unit.availability === 'Available' || unit.availability === 'available'
      )
      const unitsWithZipCode = unitsToProcess.filter(unit => !!unit.zipCode)
      
      console.log(`📈 Unit summary:`, {
        total: unitsToProcess.length,
        available: availableUnits.length,
        withZipCode: unitsWithZipCode.length
      })
      
      if (unitsWithZipCode.length === 0) {
        console.log(`❌ No units will appear on map because:`)
        console.log(`   - ${unitsWithZipCode.length} units have zip codes (need > 0)`)
        console.log(`💡 To fix: Add zip codes to units in the Units page`)
      }
      
      // Debug each unit's availability and zip code
      unitsToProcess.forEach((unit, index) => {
        console.log(`🔍 Unit ${index + 1}:`, {
          id: unit.id,
          unitNumber: unit.unitNumber,
          name: unit.name,
          availability: unit.availability,
          zipCode: unit.zipCode,
          location: unit.location
        })
        
        // Check zip code availability
        console.log(`🔍 Unit ${index + 1} zip code check:`, {
          zipCode: unit.zipCode,
          hasZipCode: !!unit.zipCode
        })
      })
      setIsLoadingUnits(true)
      const markers: any[] = []

      for (const unit of unitsToProcess) {
        console.log(`🔍 Processing unit ${unit.unitNumber}:`, {
          id: unit.id,
          availability: unit.availability,
          zipCode: unit.zipCode,
          name: unit.name
        })

        // Check if unit has zip code (show all units with zip codes, regardless of availability)
        if (unit.zipCode) {
          console.log(`✅ Unit ${unit.unitNumber} has zip code ${unit.zipCode}`)
          try {
            const coordinates = await getCoordinatesFromZipCode(unit.zipCode)
            console.log(`📍 Coordinates for unit ${unit.unitNumber}:`, coordinates)
            
            if (coordinates) {
              // Don't calculate distance here - that's handled in the separate useEffect
              const marker = {
                id: unit.id,
                position: coordinates,
                title: `Unit ${unit.unitNumber}`,
                icon: '🚛', // Truck emoji for units
                info: `
                  <div class="p-2">
                    <h3 class="font-semibold text-gray-900">Unit ${unit.unitNumber}</h3>
                    <p class="text-sm text-gray-600">${unit.name}</p>
                    ${unit.vehicle?.driver ? `<p class="text-sm text-gray-600"><strong>Driver:</strong> ${unit.vehicle.driver.firstName} ${unit.vehicle.driver.lastName}</p>` : ''}
                    <p class="text-sm text-gray-600"><strong>Location:</strong> ${unit.location || 'Not specified'}</p>
                    <p class="text-sm text-gray-600"><strong>Zip Code:</strong> ${unit.zipCode}</p>
                    <p class="text-sm text-gray-600"><strong>Available Time:</strong> ${unit.availableTime || 'Not specified'}</p>
                    ${unit.notes ? `<p class="text-sm text-gray-600"><strong>Notes:</strong> ${unit.notes}</p>` : ''}
                  </div>
                `
              }
              markers.push(marker)
              console.log(`✅ Added marker for unit ${unit.unitNumber}`)
            } else {
              console.log(`❌ No coordinates found for unit ${unit.unitNumber}`)
            }
          } catch (error) {
            console.error(`❌ Error processing unit ${unit.unitNumber}:`, error)
          }
        } else {
          console.log(`⚠️ Unit ${unit.unitNumber} skipped:`, {
            hasZipCode: !!unit.zipCode,
            zipCode: unit.zipCode,
            fullUnit: unit
          })
          console.log(`🔍 Skip reason for unit ${unit.unitNumber}:`, {
            noZipCode: !unit.zipCode,
            zipCodeValue: unit.zipCode,
            hasZipCode: !!unit.zipCode
          })
        }
      }

      console.log(`🎯 Final markers created:`, markers)
      setUnitMarkers(markers)
      setIsLoadingUnits(false)
    }

    processUnits()
  }, [unitsData]) // Removed hasCalculated and filteredUnits from dependencies

  // Function to recalculate markers with distances - only called when Submit is clicked
  const recalculateMarkersWithDistances = async () => {
    if (!zipCodeFilter || !googleMapsLoaded || !unitsData?.data) return
    
    console.log('🔄 Recalculating markers with distances...')
    const unitsToProcess = unitsData.data
    const markers: any[] = []

    for (const unit of unitsToProcess) {
      if (unit.zipCode) {
        try {
          const coordinates = await getCoordinatesFromZipCode(unit.zipCode)
          if (coordinates) {
            // Calculate distance for this unit
            let distanceInfo = ''
            let distanceText = ''
            try {
              const distanceResult = await distanceService.calculateDistanceBetweenZipCodes(zipCodeFilter, unit.zipCode)
              if (distanceResult.distance && !distanceResult.error) {
                const distance = Math.round(distanceResult.distance)
                const googleMapsUrl = `https://www.google.com/maps/dir/${zipCodeFilter}/${unit.zipCode}`
                distanceInfo = `<p class="text-sm text-blue-600 font-medium"><strong>Distance:</strong> <a href="${googleMapsUrl}" target="_blank" class="underline hover:text-blue-800">${distance} mi</a></p>`
                distanceText = ` (${distance} mi)`
              }
            } catch (error) {
              console.error(`Error calculating distance for unit ${unit.unitNumber}:`, error)
            }

            const marker = {
              id: unit.id,
              position: coordinates,
              title: `Unit ${unit.unitNumber}${distanceText}`,
              icon: '🚛',
              info: `
                <div class="p-2">
                  <h3 class="font-semibold text-gray-900">Unit ${unit.unitNumber}</h3>
                  <p class="text-sm text-gray-600">${unit.name}</p>
                  ${unit.vehicle?.driver ? `<p class="text-sm text-gray-600"><strong>Driver:</strong> ${unit.vehicle.driver.firstName} ${unit.vehicle.driver.lastName}</p>` : ''}
                  <p class="text-sm text-gray-600"><strong>Location:</strong> ${unit.location || 'Not specified'}</p>
                  <p class="text-sm text-gray-600"><strong>Zip Code:</strong> ${unit.zipCode}</p>
                  <p class="text-sm text-gray-600"><strong>Available Time:</strong> ${unit.availableTime || 'Not specified'}</p>
                  ${unit.notes ? `<p class="text-sm text-gray-600"><strong>Notes:</strong> ${unit.notes}</p>` : ''}
                  ${distanceInfo}
                </div>
              `
            }
            markers.push(marker)
          }
        } catch (error) {
          console.error(`Error processing unit ${unit.unitNumber}:`, error)
        }
      }
    }

    setUnitMarkers(markers)
  }

  if (isLoading || isLoadingUnits) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map data...</p>
        </div>
      </div>
    )
  }

  // Combine order markers and unit markers
  const allMarkers = [
    // Pickup marker (if coordinates are available)
    ...(pickupCoordinates ? [{
      id: 'pickup-location',
      position: pickupCoordinates,
      title: 'Pickup Location',
      icon: '📍', // Red pin emoji for pickup
      info: `
        <div class="p-2">
          <h3 class="font-semibold text-red-600">Pickup Location</h3>
          <p class="text-sm text-gray-600"><strong>Zip Code:</strong> ${zipCodeFilter}</p>
          <p class="text-sm text-gray-600"><strong>Radius:</strong> ${milesRadius} miles</p>
        </div>
      `
    }] : []),
    // Order markers (existing)
    ...(dashboard?.activeOrders.map(order => ({
      id: `order-${order.id}`,
      position: { lat: 40.7128, lng: -74.0060 }, // Default NYC coordinates for orders
      title: `Order #${order.orderNumber}`,
      icon: '📦', // Package emoji for orders
      info: `
        <div class="p-2">
          <h3 class="font-semibold text-gray-900">Order #${order.orderNumber}</h3>
          <p class="text-sm text-gray-600"><strong>Customer:</strong> ${order.customer.name}</p>
          <p class="text-sm text-gray-600"><strong>Status:</strong> ${order.status}</p>
        </div>
      `
    })) || []),
    // Unit markers (new)
    ...unitMarkers
  ]

  console.log('🗺️ All markers being sent to map:', allMarkers)
  console.log('🔍 Unit markers state:', unitMarkers)
  console.log('🔍 Dashboard data:', dashboard)
  console.log('🔍 Units data:', unitsData)


  return (
    <div className="h-screen flex flex-col">
      {/* Top Search Bar */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center gap-4 shadow-sm`}>
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className={`px-4 py-2 ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'} rounded-md transition-colors duration-200`}
        >
          Back
        </button>

        {/* Pickup Zip Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="pickupZip" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Pickup Zip:
          </label>
          <input
            id="pickupZip"
            type="text"
            value={zipCodeFilter}
            onChange={(e) => setZipCodeFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyDistanceFilter()
              }
            }}
            placeholder="Enter zip code"
            className={`w-32 px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>


        {/* Radius Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="radius" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Radius:
          </label>
          <input
            id="radius"
            type="number"
            value={milesRadius}
            onChange={(e) => setMilesRadius(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyDistanceFilter()
              }
            }}
            placeholder="150"
            className={`w-20 px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={applyDistanceFilter}
          disabled={!zipCodeFilter || !milesRadius || !googleMapsLoaded}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 font-medium"
        >
          Submit
        </button>
      </div>

      {/* Map - Full Screen */}
      <div className="flex-1 w-full">
        <GoogleMap
          key={pickupCoordinates ? `${pickupCoordinates.lat}-${pickupCoordinates.lng}` : 'default'}
          center={pickupCoordinates || { lat: 39.8283, lng: -98.5795 }}
          zoom={pickupCoordinates ? 6 : 4}
          markers={allMarkers}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}