import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Search, Filter, Edit, Save, X, MapPin, Clock, FileText, Loader2 } from 'lucide-react'
import { unitService, Unit } from '@/services/unitService'
import { distanceService, DistanceResult } from '@/services/distanceService'
import { geocodeZipCode, formatLocationFromGeocoding, isValidZipCode } from '@/utils/geocoding'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import toast from 'react-hot-toast'

const unitEditSchema = z.object({
  notes: z.string().optional(),
  availability: z.string().optional(),
  location: z.string().optional(),
  zipCode: z.string().optional(),
  availableTime: z.string().optional()
})

type UnitEditData = z.infer<typeof unitEditSchema>

interface UnitEditFormProps {
  unit: Unit
  onClose: () => void
  onSuccess: () => void
}

function UnitEditForm({ unit, onClose, onSuccess }: UnitEditFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const queryClient = useQueryClient()
  // Check if Google Maps is loaded
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [isGoogleMapsLoading, setIsGoogleMapsLoading] = useState(true)
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null)

  // Check Google Maps loading status
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 100 // 10 seconds max wait
    
    const checkGoogleMaps = () => {
      if ((window as any).google && (window as any).google.maps) {
        console.log('✅ Google Maps loaded successfully')
        setIsGoogleMapsLoaded(true)
        setIsGoogleMapsLoading(false)
      } else if (attempts >= maxAttempts) {
        console.log('⚠️ Google Maps failed to load after 10 seconds')
        setGoogleMapsError('Google Maps API failed to load')
        setIsGoogleMapsLoading(false)
      } else {
        attempts++
        console.log(`🔄 Checking Google Maps... attempt ${attempts}/${maxAttempts}`)
        setTimeout(checkGoogleMaps, 100)
      }
    }
    
    checkGoogleMaps()
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<UnitEditData>({
    resolver: zodResolver(unitEditSchema),
    defaultValues: {
      notes: unit.notes || '',
      availability: unit.availability || '',
      location: unit.location || '',
      zipCode: unit.zipCode || '',
      availableTime: unit.availableTime || ''
    }
  })

  const watchedZipCode = watch('zipCode')

  // Manual geocode when user clicks button
  const handleZipCodeChange = async (zipCode: string) => {
    if (!zipCode || !isValidZipCode(zipCode)) return
    
    // If Google Maps is not loaded yet, wait for it
    if (!isGoogleMapsLoaded && !googleMapsError) {
      console.log('⏳ Waiting for Google Maps to load...')
      // Wait a bit and try again
      setTimeout(() => handleZipCodeChange(zipCode), 500)
      return
    }

    if (googleMapsError) {
      console.log('❌ Google Maps failed to load:', googleMapsError)
      toast.error('Google Maps is not available. Please enter location manually.')
      return
    }

    setIsGeocoding(true)
    try {
      console.log('🌍 Starting geocoding for zip code:', zipCode)
      const result = await geocodeZipCode(zipCode)
      if (result) {
        const formattedLocation = formatLocationFromGeocoding(result)
        setValue('location', formattedLocation)
        console.log('✅ Location updated:', formattedLocation)
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error)
      toast.error('Could not find location for this zip code')
    } finally {
      setIsGeocoding(false)
    }
  }

  const updateMutation = useMutation({
    mutationFn: (data: UnitEditData) => unitService.updateUnit(unit.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update unit')
    }
  })

  const onSubmit = async (data: UnitEditData) => {
    setIsLoading(true)
    try {
      await updateMutation.mutateAsync(data)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Unit: {unit.unitNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Unit Info Display */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Unit Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Unit #:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{unit.unitNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Name:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{unit.name}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Vehicle:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{unit.vehicle.make} {unit.vehicle.model}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Status:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{unit.vehicle.status}</span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Add notes about this unit..."
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Availability
                  </label>
            <select
              {...register('availability')}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'NOT_AVAILABLE') {
                  // Clear zip code, location, and available time when not available
                  setValue('zipCode', '')
                  setValue('location', '')
                  setValue('availableTime', '')
                }
                register('availability').onChange(e)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="NOT_AVAILABLE">Not Available</option>
            </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Available Time
                  </label>
                  <input
                    {...register('availableTime')}
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    {...register('location')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Current location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Zip Code
                    {isGeocoding && (
                      <Loader2 className="h-3 w-3 inline ml-2 animate-spin text-blue-600" />
                    )}
                    {isGoogleMapsLoading && (
                      <span className="text-xs text-yellow-600 ml-2">Loading Maps...</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      {...register('zipCode')}
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="12345"
                      disabled={!isGoogleMapsLoaded}
                    />
                    <button
                      type="button"
                      onClick={() => handleZipCodeChange(watchedZipCode || '')}
                      disabled={!isGoogleMapsLoaded || !watchedZipCode || watchedZipCode.length < 5 || isGeocoding}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    >
                      {isGeocoding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Get Location'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {googleMapsError ? (
                      <span className="text-red-600">Google Maps API not available. Location auto-fill disabled.</span>
                    ) : !isGoogleMapsLoaded ? (
                      <span className="text-yellow-600">Loading Google Maps...</span>
                    ) : (
                      'Enter a US zip code and click "Get Location" to automatically fill the location'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Unit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Units() {
  const { isLoaded: googleMapsLoaded, isLoading: googleMapsLoading, error: googleMapsError } = useGoogleMaps()
  const [searchTerm, setSearchTerm] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [zipCodeFilter, setZipCodeFilter] = useState('')
  const [milesRadius, setMilesRadius] = useState('150')
  const [hasCalculated, setHasCalculated] = useState(false)

  // Calculate distance for a single unit using Google Maps
  const getUnitDistance = async (unit: Unit): Promise<DistanceResult> => {
    if (!zipCodeFilter || !unit.zipCode || !googleMapsLoaded) {
      return { distance: 0, error: 'Google Maps not ready or missing zip codes' }
    }
    
    try {
      return await distanceService.calculateDistanceBetweenZipCodes(zipCodeFilter, unit.zipCode)
    } catch (error) {
      console.error('Error calculating distance:', error)
      return { distance: 0, error: 'Failed to calculate distance' }
    }
  }

  // Filter units based on distance using Google Maps
  const filterUnitsByDistance = async (units: Unit[], centerZip: string, radius: number) => {
    if (!centerZip || !radius || !googleMapsLoaded) return units
    
    const filteredUnits = []
    for (const unit of units) {
      if (unit.zipCode) {
        try {
          const result = await distanceService.calculateDistanceBetweenZipCodes(centerZip, unit.zipCode)
          if (result.distance <= radius && !result.error) {
            filteredUnits.push(unit)
          }
        } catch (error) {
          console.error(`Error calculating distance for unit ${unit.id}:`, error)
        }
      }
    }
    return filteredUnits
  }

  // Fetch units from the API
  const { data: unitsData, isLoading, error } = useQuery({
    queryKey: ['units', searchTerm, availabilityFilter],
    queryFn: () => unitService.getUnits({
      page: 1,
      limit: 100,
      search: searchTerm,
      availability: availabilityFilter
    })
  })

  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([])
  const units = unitsData?.data || []

  // Initialize filteredUnits when units change
  useEffect(() => {
    setFilteredUnits(units)
  }, [units])

  // Apply distance filtering only when manually triggered
  const applyDistanceFilter = async () => {
    console.log('🔍 Starting distance filter:', { zipCodeFilter, milesRadius, unitsCount: units.length })
    if (zipCodeFilter && milesRadius && units.length > 0) {
      const radius = parseInt(milesRadius)
      console.log(`📏 Filtering units within ${radius} miles of ${zipCodeFilter}`)
      const filtered = await filterUnitsByDistance(units, zipCodeFilter, radius)
      console.log(`✅ Filtered to ${filtered.length} units`)
      setFilteredUnits(filtered)
      // Trigger distance calculation for all units
      setHasCalculated(true)
    } else {
      console.log('⚠️ Missing requirements for distance filter')
      setFilteredUnits(units)
      setHasCalculated(false)
    }
  }

  // Use filtered units if distance filter is active, otherwise use all units
  const displayUnits = (zipCodeFilter && milesRadius) ? filteredUnits : units

  // Component to display unit distance
  const UnitDistance = ({ unit }: { unit: Unit }) => {
    const [distanceResult, setDistanceResult] = useState<DistanceResult | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    
    // Only calculate when distance filter is active and has been triggered
    useEffect(() => {
      if (zipCodeFilter && milesRadius && unit.zipCode && googleMapsLoaded && hasCalculated) {
        setIsCalculating(true)
        getUnitDistance(unit).then((result) => {
          setDistanceResult(result)
          setIsCalculating(false)
        })
      } else if (!zipCodeFilter || !milesRadius) {
        setDistanceResult(null)
      }
    }, [zipCodeFilter, unit.zipCode, googleMapsLoaded, hasCalculated])
    
    if (!zipCodeFilter || !milesRadius) {
      return null
    }
    
    if (isCalculating) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-gray-500 dark:text-gray-400">Calculating...</span>
        </div>
      )
    }
    
    if (!distanceResult) {
      return null
    }
    
    if (distanceResult.error) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-500 dark:text-red-400">Error: {distanceResult.error}</span>
        </div>
      )
    }
    
    const openGoogleMaps = () => {
      if (zipCodeFilter && unit.zipCode) {
        const googleMapsUrl = `https://www.google.com/maps/dir/${zipCodeFilter}/${unit.zipCode}`
        window.open(googleMapsUrl, '_blank')
      }
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Distance:</span>
        <button
          onClick={openGoogleMaps}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors"
          title="Click to open Google Maps directions"
        >
          {distanceResult.distance}mi
        </button>
        {distanceResult.duration && (
          <span className="text-gray-500 dark:text-gray-400">({distanceResult.duration}min)</span>
        )}
      </div>
    )
  }

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit)
  }

  const handleCloseEdit = () => {
    setEditingUnit(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Units
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage unit information, availability, and location tracking.</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Units are automatically created when vehicles are added in the Fleet section
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Enter zip code"
            value={zipCodeFilter}
            onChange={(e) => setZipCodeFilter(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && zipCodeFilter && milesRadius) {
                applyDistanceFilter()
                console.log(`Filtering units within ${milesRadius} miles of ${zipCodeFilter}`)
              }
            }}
            className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <div className="relative">
          <input
            type="number"
            placeholder="150"
            value={milesRadius}
            onChange={(e) => setMilesRadius(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && zipCodeFilter && milesRadius) {
                applyDistanceFilter()
                console.log(`Filtering units within ${milesRadius} miles of ${zipCodeFilter}`)
              }
            }}
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <button
          onClick={async () => {
            if (zipCodeFilter && milesRadius) {
              console.log(`Calculating distances from ${zipCodeFilter} within ${milesRadius} miles`)
              await applyDistanceFilter()
            }
          }}
          disabled={!googleMapsLoaded || googleMapsLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2"
        >
          {googleMapsLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Maps...
            </>
          ) : (
            'Calculate Miles'
          )}
        </button>
        <button
          onClick={() => {
            setZipCodeFilter('')
            setMilesRadius('150')
            setFilteredUnits(units)
            setHasCalculated(false)
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
        >
          Clear
        </button>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Availability</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="NOT_AVAILABLE">Not Available</option>
          </select>
        </div>
      </div>

      {/* Google Maps Error */}
      {googleMapsError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">
            Google Maps Error: {googleMapsError}. Distance calculations may not work properly.
          </p>
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Truck className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-theme-primary">Error loading units</h3>
            <p className="text-theme-secondary">Please try refreshing the page or contact support.</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading units...</p>
        </div>
      ) : displayUnits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayUnits.map((unit) => (
            <div key={unit.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{unit.unitNumber}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{unit.name}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <UnitDistance unit={unit} />
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{unit.dimensions || 'Not specified'}</span>
                </div>
                {unit.vehicle.driver && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Driver:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{unit.vehicle.driver.firstName} {unit.vehicle.driver.lastName}</span>
                  </div>
                )}
                {unit.availability && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Availability:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{unit.availability}</span>
                  </div>
                )}
                {unit.availability === 'BUSY' && unit.availableTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Available Time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{unit.availableTime}</span>
                  </div>
                )}
                {unit.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Location:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{unit.location}</span>
                  </div>
                )}
                {unit.zipCode && (
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Zip Code:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{unit.zipCode}</span>
                </div>
                )}
                {unit.notes && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                    <p className="text-gray-900 dark:text-white mt-1">{unit.notes}</p>
                </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => handleEditUnit(unit)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Unit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No units found</h3>
          <p className="text-gray-600 dark:text-gray-300">Units are automatically created when vehicles are added in the Fleet section.</p>
        </div>
      )}

      {/* Unit Edit Modal */}
      {editingUnit && (
        <UnitEditForm
          unit={editingUnit}
          onClose={handleCloseEdit}
          onSuccess={handleCloseEdit}
        />
      )}
    </div>
  )
}


