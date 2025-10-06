import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useGoogleMaps } from '../hooks/useGoogleMaps'
import { useTheme } from '../contexts/ThemeContext'

interface GoogleMapProps {
  center?: any
  zoom?: number
  markers?: Array<{
    id: string
    position: any
    title: string
    icon?: string
    info?: string
  }>
  onMarkerClick?: (marker: any) => void
  className?: string
}

const LoadingComponent = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

const ErrorComponent = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="text-red-600 mb-4">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load map</h3>
      <p className="text-gray-600">Please check your internet connection and try again.</p>
    </div>
  </div>
)

const MapComponent: React.FC<GoogleMapProps> = ({ 
  center = { lat: 39.8283, lng: -98.5795 }, // Center of USA
  zoom = 4,
  markers = [],
  onMarkerClick,
  className = "h-96 w-full"
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>()
  const [mapMarkers, setMapMarkers] = useState<any[]>([])
  const { isDarkMode } = useTheme()

  // Memoize markers to prevent unnecessary re-renders
  const stableMarkers = useMemo(() => markers, [
    markers.map(m => `${m.id}-${m.position?.lat}-${m.position?.lng}-${m.title}-${m.info}`).join(',')
  ])

  // Theme-aware map styles
  const mapStyles = useMemo(() => {
    if (isDarkMode) {
      // Dark theme styles
      return [
        {
          "elementType": "geometry",
          "stylers": [{ "color": "#212121" }]
        },
        {
          "elementType": "labels.icon",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#757575" }]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#212121" }]
        },
        {
          "featureType": "administrative",
          "elementType": "geometry",
          "stylers": [{ "color": "#757575" }]
        },
        {
          "featureType": "administrative.country",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#9e9e9e" }]
        },
        {
          "featureType": "administrative.land_parcel",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "administrative.locality",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#bdbdbd" }]
        },
        {
          "featureType": "poi",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#757575" }]
        },
        {
          "featureType": "poi",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "geometry",
          "stylers": [{ "color": "#181818" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#616161" }]
        },
        {
          "featureType": "poi.park",
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#1b1b1b" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry.fill",
          "stylers": [{ "color": "#2c2c2c" }]
        },
        {
          "featureType": "road",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#8a8a8a" }]
        },
        {
          "featureType": "road.arterial",
          "elementType": "geometry",
          "stylers": [{ "color": "#373737" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry",
          "stylers": [{ "color": "#3c3c3c" }]
        },
        {
          "featureType": "road.highway.controlled_access",
          "elementType": "geometry",
          "stylers": [{ "color": "#4e4e4e" }]
        },
        {
          "featureType": "road.local",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#616161" }]
        },
        {
          "featureType": "transit",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#757575" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#000000" }]
        },
        {
          "featureType": "water",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#3d3d3d" }]
        }
      ]
    } else {
      // Light theme styles (minimal styling to keep it clean)
      return [
        {
          "featureType": "poi",
          "elementType": "labels",
          "stylers": [{ "visibility": "off" }]
        }
      ]
    }
  }, [isDarkMode])

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new (window as any).google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
        scrollwheel: true,
        styles: mapStyles
      })
      setMap(newMap)
    }
  }, [ref, map])

  // Update map center and zoom when props change
  useEffect(() => {
    if (map) {
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }, [map, center, zoom])

  // Update map styles when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: mapStyles })
    }
  }, [map, mapStyles])

  // Update markers when markers prop changes
  useEffect(() => {
    if (!map) return

    // Clear existing markers
    mapMarkers.forEach(marker => marker.setMap(null))
    const newMarkers: any[] = []

    // Add new markers
    stableMarkers.forEach(markerData => {
      // Create custom icon for emoji markers
      let markerIcon = undefined
      if (markerData.icon && markerData.icon.length <= 2) {
        // It's an emoji, create a custom icon
        markerIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="white" stroke="#4285F4" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" font-size="20">${markerData.icon}</text>
            </svg>
          `)}`,
          scaledSize: new (window as any).google.maps.Size(40, 40),
          anchor: new (window as any).google.maps.Point(20, 20)
        }
      } else if (markerData.icon) {
        // It's a URL or other icon
        markerIcon = markerData.icon
      }

      const marker = new (window as any).google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon: markerIcon
      })

      // Add click listener
      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(markerData)
        }
      })

      // Add info window if info is provided
      if (markerData.info) {
        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: markerData.info
        })

        marker.addListener('click', () => {
          infoWindow.open(map, marker)
        })
      }

      newMarkers.push(marker)
    })

    setMapMarkers(newMarkers)

    // Keep the map at the default zoom level - no auto-zoom to markers
  }, [map, stableMarkers, onMarkerClick])

  return <div ref={ref} className={className} />
}

const GoogleMap: React.FC<GoogleMapProps> = (props) => {
  const { isLoaded, isLoading, error } = useGoogleMaps()

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 w-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Google Maps API Key Required</h3>
          <p className="text-gray-600">Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingComponent />
  }

  if (!isLoaded) {
    return <ErrorComponent />
  }

  return <MapComponent {...props} />
}

export default GoogleMap
