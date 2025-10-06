import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar
} from 'lucide-react'
import { vehicleService, Vehicle, CreateVehicleData } from '@/services/vehicleService'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const vehicleSchema = z.object({
  unitNumber: z.string().optional().or(z.literal('')),
  driverName: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  make: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z.string().optional().or(z.literal('')),
  vin: z.string().optional().or(z.literal('')),
  licensePlate: z.string().optional().or(z.literal('')),
  registrationExpDate: z.string().optional().or(z.literal('')),
  insuranceExpDate: z.string().optional().or(z.literal('')),
  dimensions: z.string().optional().or(z.literal('')),
  payload: z.string().optional().or(z.literal('')),
  insuranceDocument: z.any().optional(),
  registrationDocument: z.any().optional()
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  vehicle?: Vehicle
  onClose: () => void
  onSuccess: () => void
}


interface Document {
  id: string
  name: string
  type: string
  size: number
  file?: File
  uploadDate: string
  path?: string // For existing documents from database
}

function VehicleForm({ vehicle, onClose, onSuccess }: VehicleFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize documents when editing a vehicle
  useEffect(() => {
    if (vehicle) {
      console.log('Vehicle data received:', vehicle)
      console.log('Vehicle documents:', vehicle.documents)
      
      const existingDocs: Document[] = []
      
      // Add documents from the new system
      if (vehicle.documents && Array.isArray(vehicle.documents)) {
        console.log('Processing documents from new system:', vehicle.documents)
        vehicle.documents.forEach((doc, index) => {
          existingDocs.push({
            id: `doc_${index}`,
            name: doc.name,
            type: 'application/pdf',
            size: 0,
            uploadDate: doc.uploadDate,
            path: doc.path // Store the file path for URL construction
          })
        })
      }
      
      // Add legacy documents for backward compatibility
      if (vehicle.insuranceDocument) {
        existingDocs.push({
          id: 'insurance',
          name: 'Insurance Document',
          type: 'application/pdf',
          size: 0,
          uploadDate: vehicle.createdAt
        })
      }
      
      if (vehicle.registrationDocument) {
        existingDocs.push({
          id: 'registration',
          name: 'Registration Document',
          type: 'application/pdf',
          size: 0,
          uploadDate: vehicle.createdAt
        })
      }
      
      console.log('Final documents array:', existingDocs)
      setDocuments(existingDocs)
    } else {
      console.log('No vehicle data, clearing documents')
      setDocuments([])
    }
  }, [vehicle])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ? {
      unitNumber: vehicle.unitNumber || '',
      driverName: vehicle.driverName || '',
      color: vehicle.color || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ? vehicle.year.toString() : '',
      vin: vehicle.vin || '',
      licensePlate: vehicle.licensePlate || '',
      registrationExpDate: vehicle.registrationExpDate || '',
      insuranceExpDate: vehicle.insuranceExpDate || '',
      dimensions: vehicle.dimensions || '',
      payload: vehicle.payload || '',
      insuranceDocument: undefined,
      registrationDocument: undefined
    } : {}
  })

  const createMutation = useMutation({
    mutationFn: vehicleService.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Create vehicle error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create vehicle'
      toast.error(errorMessage)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateVehicleData }) =>
      vehicleService.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vehicle')
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vehicleService.updateVehicleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vehicle status')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: vehicleService.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete vehicle')
    }
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ vehicleId, documentIndex }: { vehicleId: string; documentIndex: number }) => 
      vehicleService.deleteDocument(vehicleId, documentIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      // Refresh the vehicle data to update the documents list
      if (vehicle) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle.id] })
      }
    },
    onError: (error: any) => {
      console.error('Delete document error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete document')
    }
  })

  const handleStatusChange = async (vehicle: Vehicle, newStatus: string) => {
    await statusMutation.mutateAsync({ id: vehicle.id, status: newStatus })
  }

  const handleDelete = async (vehicle: Vehicle) => {
    await deleteMutation.mutateAsync(vehicle.id)
  }

  const handleDeleteDocument = async (documentIndex: number) => {
    // If it's a new document (has a file), just remove it from the local state
    if (documents[documentIndex]?.file) {
      setDocuments(prev => prev.filter((_, index) => index !== documentIndex))
      return
    }
    
    // If it's a saved document, delete it from the database and immediately remove from UI
    if (vehicle) {
      // Remove from UI immediately
      setDocuments(prev => prev.filter((_, index) => index !== documentIndex))
      
      // Then delete from database
      try {
        await deleteDocumentMutation.mutateAsync({ 
          vehicleId: vehicle.id, 
          documentIndex 
        })
      } catch (error) {
        // If deletion fails, reload the documents from the database
        if (vehicle) {
          const existingDocs: Document[] = []
          
          if (vehicle.documents && Array.isArray(vehicle.documents)) {
            vehicle.documents.forEach((doc, index) => {
              existingDocs.push({
                id: `doc_${index}`,
                name: doc.name,
                type: 'application/pdf',
                size: 0,
                uploadDate: doc.uploadDate,
                path: doc.path
              })
            })
          }
          
          setDocuments(existingDocs)
        }
      }
    }
  }

  const onSubmit = async (data: VehicleFormData) => {
    setIsLoading(true)
    try {
      console.log('Form data received:', data)
      
      // Create FormData for file uploads
      const formData = new FormData()
      
      // Add all form fields
      formData.append('make', data.make && data.make.trim() ? data.make : 'Unknown')
      formData.append('model', data.model && data.model.trim() ? data.model : 'Unknown')
      formData.append('year', data.year && data.year.trim() ? data.year : new Date().getFullYear().toString())
      formData.append('licensePlate', (data.licensePlate && data.licensePlate.trim()) || (data.unitNumber && data.unitNumber.trim()) || 'TEMP-PLATE')
      
      if (data.payload && data.payload.trim()) {
        formData.append('capacity', parseFloat(data.payload.replace(/[^\d.]/g, '')).toString())
      }
      if (data.vin && data.vin.trim()) formData.append('vin', data.vin.trim())
      formData.append('color', data.color || '')
      formData.append('unitNumber', data.unitNumber || '')
      formData.append('driverName', data.driverName || '')
      formData.append('dimensions', data.dimensions || '')
      formData.append('payload', data.payload || '')
      formData.append('registrationExpDate', data.registrationExpDate || '')
      formData.append('insuranceExpDate', data.insuranceExpDate || '')
      
      // Add documents from the new document system
      documents.forEach((doc, index) => {
        if (doc.file) {
          formData.append(`document_${index}`, doc.file)
          formData.append(`document_name_${index}`, doc.name)
        }
      })
      
      // Add legacy document fields for backward compatibility
      if (data.insuranceDocument && data.insuranceDocument.length > 0) {
        formData.append('insuranceDocument', data.insuranceDocument[0])
      } else if (vehicle?.insuranceDocument) {
        formData.append('insuranceDocument', vehicle.insuranceDocument)
      }
      
      if (data.registrationDocument && data.registrationDocument.length > 0) {
        formData.append('registrationDocument', data.registrationDocument[0])
      } else if (vehicle?.registrationDocument) {
        formData.append('registrationDocument', vehicle.registrationDocument)
      }

      console.log('Data being sent to backend:', formData)
      
      // Debug: Log all FormData entries
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`)
      }

      // Convert FormData to CreateVehicleData
      const vehicleData: CreateVehicleData = {
        make: formData.get('make') as string,
        model: formData.get('model') as string,
        year: parseInt(formData.get('year') as string),
        licensePlate: formData.get('licensePlate') as string,
        vin: formData.get('vin') as string || undefined,
        color: formData.get('color') as string || undefined,
        capacity: formData.get('capacity') ? parseFloat(formData.get('capacity') as string) : undefined
      }

      if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, data: vehicleData })
      } else {
        await createMutation.mutateAsync(vehicleData)
      }
    } catch (error: any) {
      console.error('Form submission error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Full error details:', JSON.stringify(error.response?.data, null, 2))
      
      // Show detailed error message
      if (error.response?.data?.errors) {
        // Zod validation errors
        const validationErrors = error.response.data.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
        toast.error(`Validation errors: ${validationErrors}`)
        console.error('Validation errors:', error.response.data.errors)
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to create vehicle. Please check the console for details.')
      }
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
              {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Top Row - Unit # and Driver Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit #
                </label>
                <input
                  {...register('unitNumber')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., TRK-001"
                />
                {errors.unitNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.unitNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver Name
                </label>
                <input
                  {...register('driverName')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., John Smith"
                />
                {errors.driverName && (
                  <p className="mt-1 text-sm text-red-600">{errors.driverName.message}</p>
                )}
              </div>
            </div>

            {/* Vehicle Details Row - Color, Make, Model, Year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  {...register('color')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., White"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Make
                </label>
                <input
                  {...register('make')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., Ford"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model
                </label>
                <input
                  {...register('model')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., Transit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <input
                  {...register('year')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="2024"
                />
              </div>
            </div>

            {/* VIN and Plate Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VIN #
                </label>
                <input
                  {...register('vin')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="17-character VIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plate #
                </label>
                <input
                  {...register('licensePlate')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="ABC-123"
                />
              </div>
            </div>

            {/* Registration and Insurance Exp. Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registration Exp. Date
                </label>
                <input
                  {...register('registrationExpDate')}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Insurance Exp. Date
                </label>
                <input
                  {...register('insuranceExpDate')}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Vehicle Dimensions and Payload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Dimensions
                </label>
                <input
                  {...register('dimensions')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., 20ft x 8ft x 9ft"
                />
                {errors.dimensions && (
                  <p className="mt-1 text-sm text-red-600">{errors.dimensions.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payload
                </label>
                <input
                  {...register('payload')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="e.g., 10,000 lbs"
                />
              </div>
            </div>

            {/* Vehicle Management Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vehicle Management</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Change Status
                  </label>
                  <select
                    value={vehicle?.status || 'AVAILABLE'}
                    onChange={(e) => {
                      if (vehicle) {
                        handleStatusChange(vehicle, e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={statusMutation.isPending}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Danger Zone
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (vehicle && window.confirm(`Are you sure you want to delete ${vehicle.unitNumber || vehicle.licensePlate}? This action cannot be undone.`)) {
                        handleDelete(vehicle)
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Vehicle'}
                  </button>
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h3>
              </div>
              {/* Upload Document Button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => document.getElementById('document-upload')?.click()}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Document
                </button>
                  <input
                  ref={fileInputRef}
                  id="document-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]
                      const newDocument = {
                        id: Date.now().toString(),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        file: file,
                        uploadDate: new Date().toISOString()
                      }
                      setDocuments(prev => [...prev, newDocument])
                      
                      // Reset the file input so the same file can be uploaded again
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Documents Table */}
              {documents.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-4 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div>Document</div>
                      <div>Notes</div>
                      <div>Date</div>
                      <div className="text-right">Actions</div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {documents.map((doc, index) => (
                      <div key={doc.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="grid grid-cols-4 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <a 
                                href={doc.file ? '#' : `http://localhost:3001/uploads/${doc.path || doc.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  if (doc.file) {
                                    e.preventDefault()
                                    // Handle new file preview/download
                                  }
                                }}
                              >
                                {doc.name}
                              </a>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.file?.name || doc.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {/* Notes field - could be made editable */}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(doc.uploadDate).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                              disabled={deleteDocumentMutation.isPending}
                            >
                              {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy document fields for backward compatibility */}
              <div className="hidden">
                <input {...register('insuranceDocument')} type="file" />
                <input {...register('registrationDocument')} type="file" />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {vehicle ? 'Updating Vehicle...' : 'Creating Vehicle...'}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {vehicle ? 'Update Vehicle' : 'Create Vehicle'}
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

export default function Fleet() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles', currentPage, searchTerm, statusFilter],
    queryFn: () => vehicleService.getVehicles({
      page: currentPage,
      limit: 10,
      search: searchTerm,
      status: statusFilter
    })
  })


  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowForm(true)
  }

  const handleAddNew = () => {
    setSelectedVehicle(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedVehicle(null)
  }

  const vehicles = vehiclesData?.data || []
  const pagination = vehiclesData?.pagination

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fleet Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Manage your vehicle fleet and track vehicle status.
          </p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Add New Vehicle
        </button>
      </div>

      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vehicles by unit number, driver name, make, model, or license plate..."
                className="input pl-10 w-64 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="input w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-theme-secondary">Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-theme-secondary" />
            <h3 className="mt-2 text-sm font-medium text-theme-primary">No vehicles found</h3>
            <p className="mt-1 text-sm text-theme-secondary">
              {searchTerm || statusFilter ? 'Try adjusting your search terms.' : 'Get started by adding your first vehicle to the fleet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Unit#
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Created
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {vehicles
                    .sort((a, b) => {
                      // Sort by unit number (ascending order: 1, 2, 3...)
                      const unitA = parseInt(a.unitNumber || a.licensePlate || '0')
                      const unitB = parseInt(b.unitNumber || b.licensePlate || '0')
                      return unitA - unitB
                    })
                    .map((vehicle) => {
                    return (
                      <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <Truck className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {vehicle.unitNumber || vehicle.licensePlate}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {vehicle.driverName || 'No driver assigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {vehicle._count?.orders || 0} orders
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-300">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {format(new Date(vehicle.createdAt), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button
                              onClick={() => handleEdit(vehicle)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-sm hover:shadow-md mx-auto"
                              title="Edit vehicle"
                            >
                              <Edit className="h-4 w-4" />
                            Edit
                            </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-theme-secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={currentPage === pagination.pages}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Vehicle Form Modal */}
      {showForm && (
        <VehicleForm
          vehicle={selectedVehicle || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}
    </div>
  )
}