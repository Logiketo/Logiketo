import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User, 
  Calendar,
  MapPin,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { orderService, Order, OrdersResponse } from '@/services/orderService'
import { customerService } from '@/services/customerService'
import { vehicleService } from '@/services/vehicleService'
import { employeeService } from '@/services/employeeService'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Document {
  id: string
  name: string
  type: string
  size: number
  file?: File
  uploadDate: string
  path?: string // For existing documents from database
  notes?: string // Notes for the document
}

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().optional().or(z.literal('')),
  driverId: z.string().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')), // Employee who took the load
  customerLoadNumber: z.string().optional().or(z.literal('')), // Customer load#
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  deliveryDate: z.string().optional().or(z.literal('')),
  miles: z.string().optional().or(z.literal('')), // Miles
  pieces: z.string().optional().or(z.literal('')), // Pieces
  weight: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  priority: z.string().optional()
})

type OrderFormData = z.infer<typeof orderSchema>

interface OrderFormProps {
  order?: Order
  onClose: () => void
  onSuccess: () => void
}

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
  ASSIGNED: { color: 'bg-blue-100 text-blue-800', icon: User, label: 'Assigned' },
  IN_TRANSIT: { color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'In Transit' },
  DELIVERED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
  RETURNED: { color: 'bg-orange-100 text-orange-800', icon: XCircle, label: 'Returned' }
}

// const priorityConfig = {
//   LOW: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
//   NORMAL: { color: 'bg-blue-100 text-blue-800', label: 'Normal' },
//   HIGH: { color: 'bg-orange-100 text-orange-800', label: 'High' },
//   URGENT: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
// }

function OrderForm({ order, onClose, onSuccess }: OrderFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch customers and vehicles for dropdowns
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getCustomers({ limit: 100 })
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getVehicles({ limit: 100 })
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getEmployees({ limit: 100 })
  })

  // Initialize documents when editing an order
  useEffect(() => {
    if (order) {
      console.log('Order data received:', order)
      console.log('Order documents:', (order as any).documents)
      
      const existingDocs: Document[] = []
      
      // Add documents from the new system
      if ((order as any).documents && Array.isArray((order as any).documents)) {
        console.log('Processing documents from new system:', (order as any).documents)
        ;(order as any).documents.forEach((doc: any, index: number) => {
          existingDocs.push({
            id: `doc_${index}`,
            name: doc.name,
            type: 'application/pdf',
            size: 0,
            uploadDate: doc.uploadDate,
            path: doc.path, // Store the file path for URL construction
            notes: doc.notes || '' // Include notes
          })
        })
      }
      
      console.log('Final documents array:', existingDocs)
      setDocuments(existingDocs)
    } else {
      console.log('No order data, clearing documents')
      setDocuments([])
    }
  }, [order])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: order ? {
      customerId: order.customerId,
      vehicleId: order.vehicleId || '',
      driverId: order.driverId || '',
      employeeId: (order as any).employeeId || '',
      customerLoadNumber: (order as any).customerLoadNumber || '',
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      pickupDate: order.pickupDate ? format(new Date(order.pickupDate), "yyyy-MM-dd'T'HH:mm") : '',
      deliveryDate: order.deliveryDate ? format(new Date(order.deliveryDate), "yyyy-MM-dd'T'HH:mm") : '',
      miles: (order as any).miles ? (order as any).miles.toString() : '',
      pieces: (order as any).pieces ? (order as any).pieces.toString() : '',
      weight: order.weight ? order.weight.toString() : '',
      notes: order.notes || ''
    } : {
      customerId: '',
      vehicleId: '',
      driverId: '',
      employeeId: '',
      customerLoadNumber: '',
      pickupAddress: '',
      deliveryAddress: '',
      pickupDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      deliveryDate: '',
      miles: '',
      pieces: '',
      weight: '',
      value: '',
      notes: '',
      document: undefined,
      priority: 'NORMAL'
    }
  })

  // Reset form only when order.id changes (not on every render)
  const prevOrderIdRef = useRef<string | undefined>()
  useEffect(() => {
    const currentOrderId = order?.id
    // Only reset if order ID actually changed
    if (prevOrderIdRef.current !== currentOrderId) {
      prevOrderIdRef.current = currentOrderId
      
      if (order && order.id) {
        reset({
          customerId: order.customerId || '',
          vehicleId: order.vehicleId || '',
          driverId: order.driverId || '',
          employeeId: (order as any).employeeId || '',
          customerLoadNumber: (order as any).customerLoadNumber || '',
          pickupAddress: order.pickupAddress || '',
          deliveryAddress: order.deliveryAddress || '',
          pickupDate: order.pickupDate ? format(new Date(order.pickupDate), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          deliveryDate: order.deliveryDate ? format(new Date(order.deliveryDate), "yyyy-MM-dd'T'HH:mm") : '',
          miles: (order as any).miles ? (order as any).miles.toString() : '',
          pieces: (order as any).pieces ? (order as any).pieces.toString() : '',
          weight: order.weight ? order.weight.toString() : '',
          notes: order.notes || ''
        })
      } else {
        reset({
          customerId: '',
          vehicleId: '',
          driverId: '',
          employeeId: '',
          customerLoadNumber: '',
          pickupAddress: '',
          deliveryAddress: '',
          pickupDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          deliveryDate: '',
          miles: '',
          pieces: '',
          weight: '',
          notes: ''
        })
      }
    }
  }, [order?.id, order, reset])

  // Populate loadPay and driverPay fields (these are not in the form schema)
  useEffect(() => {
    if (order) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const loadPayInput = document.querySelector('input[name="loadPay"]') as HTMLInputElement
        const driverPayInput = document.querySelector('input[name="driverPay"]') as HTMLInputElement
        
        if (loadPayInput) {
          loadPayInput.value = (order as any).loadPay ? (order as any).loadPay.toString() : ''
        }
        if (driverPayInput) {
          driverPayInput.value = (order as any).driverPay ? (order as any).driverPay.toString() : ''
        }
      })
    }
  }, [order])



  const createMutation = useMutation({
    mutationFn: (data: FormData) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order created successfully!')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create order')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      orderService.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order updated successfully!')
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update order')
    }
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ orderId, documentIndex }: { orderId: string; documentIndex: number }) => 
      orderService.deleteDocument(orderId, documentIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      console.error('Delete document error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete document')
    }
  })

  const handleDeleteDocument = async (documentIndex: number) => {
    // If it's a new document (has a file), just remove it from the local state
    if (documents[documentIndex]?.file) {
      setDocuments(prev => prev.filter((_, index) => index !== documentIndex))
      return
    }
    
    // If it's a saved document, delete it from the database and immediately remove from UI
    if (order) {
      // Remove from UI immediately
      setDocuments(prev => prev.filter((_, index) => index !== documentIndex))
      
      // Then delete from database
      try {
        await deleteDocumentMutation.mutateAsync({ 
          orderId: order.id, 
          documentIndex 
        })
      } catch (error) {
        // If deletion fails, reload the documents from the database
        if (order) {
          const existingDocs: Document[] = []
          
          if ((order as any).documents && Array.isArray((order as any).documents)) {
            (order as any).documents.forEach((doc: any, index: number) => {
              existingDocs.push({
                id: `doc_${index}`,
                name: doc.name,
                type: 'application/pdf', // Assuming PDF for now, could be dynamic
                size: 0, // Size not available from backend directly
                uploadDate: doc.uploadDate,
                path: doc.path, // Store the file path for URL construction
                notes: doc.notes || '' // Include notes
              })
            })
          }
          
          setDocuments(existingDocs)
        }
      }
    }
  }

  const handleDocumentNotesChange = (documentIndex: number, notes: string) => {
    setDocuments(prev => prev.map((doc, index) => 
      index === documentIndex ? { ...doc, notes } : doc
    ))
  }

  const onSubmit = async (data: OrderFormData) => {
    console.log('Form submitted with data:', data)
    console.log('Form errors:', errors)
    console.log('Order data for editing:', order)
    setIsLoading(true)
    try {
      // Create FormData for file uploads
      const formData = new FormData()
      
      // Add all form fields
      formData.append('customerId', data.customerId)
      if (data.vehicleId && data.vehicleId.trim()) formData.append('vehicleId', data.vehicleId.trim())
      if (data.driverId && data.driverId.trim()) formData.append('driverId', data.driverId.trim())
      if (data.employeeId && data.employeeId.trim()) formData.append('employeeId', data.employeeId.trim())
      if (data.customerLoadNumber && data.customerLoadNumber.trim()) formData.append('customerLoadNumber', data.customerLoadNumber.trim())
      formData.append('pickupAddress', data.pickupAddress)
      formData.append('deliveryAddress', data.deliveryAddress)
      formData.append('pickupDate', new Date(data.pickupDate).toISOString())
      if (data.deliveryDate) formData.append('deliveryDate', new Date(data.deliveryDate).toISOString())
      if (data.miles && data.miles.trim()) formData.append('miles', Number(data.miles).toString())
      if (data.pieces && data.pieces.trim()) formData.append('pieces', Number(data.pieces).toString())
      if (data.weight && data.weight.trim()) formData.append('weight', Number(data.weight).toString())
      // Get loadPay and driverPay from form data
      const loadPayValue = (document.querySelector('input[name="loadPay"]') as HTMLInputElement)?.value || ''
      const driverPayValue = (document.querySelector('input[name="driverPay"]') as HTMLInputElement)?.value || ''
      if (loadPayValue && loadPayValue.trim()) formData.append('loadPay', loadPayValue)
      if (driverPayValue && driverPayValue.trim()) formData.append('driverPay', driverPayValue)
      if (data.notes && data.notes.trim()) formData.append('notes', data.notes.trim())
      
      // Add documents from the new document system
      documents.forEach((doc, index) => {
        if (doc.file) {
          // New file upload
          formData.append(`document_${index}`, doc.file)
          formData.append(`document_name_${index}`, doc.name)
          if (doc.notes) {
            formData.append(`document_notes_${index}`, doc.notes)
          }
        } else if (doc.path) {
          // Existing document - only send notes if they've changed
          formData.append(`existing_document_${index}_notes`, doc.notes || '')
        }
      })

      console.log('Submit data that was sent:', formData)

      if (order) {
        await updateMutation.mutateAsync({ id: order.id, data: formData })
      } else {
        await createMutation.mutateAsync(formData)
      }
      
      // Success - form will close via onSuccess callback in mutation
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
        toast.error('Failed to create order. Please check the console for details.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const customers = customersData?.data || []
  const vehicles = vehiclesData?.data || []
  const employees = employeesData?.data || [] // Fixed employees reference

  console.log('OrderForm render - isLoading:', isLoading)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" style={{ overflowY: 'auto' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {order ? 'Edit Order' : 'Create New Order'}
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
            {/* Unit# and Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit# *
                </label>
                <select
                  {...register('vehicleId')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onChange={(e) => {
                    const selectedVehicle = vehicles.find(v => v.id === e.target.value)
                    if (selectedVehicle) {
                      setValue('driverId', selectedVehicle.driverId || '')
                    }
                  }}
                >
                  <option value="">Select a unit</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.unitNumber || vehicle.licensePlate} - {vehicle.driverName || 'No Driver'}
                    </option>
                  ))}
                </select>
                {errors.vehicleId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee who took the load
                </label>
                <select
                  {...register('employeeId')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                >
                  <option value="">Select an employee (optional)</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer and Customer Load# */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer *
                </label>
                <select
                  {...register('customerId')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customerId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Load#
                </label>
                <input
                  {...register('customerLoadNumber')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter customer load number"
                />
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pickup Address *
                </label>
                <textarea
                  {...register('pickupAddress')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter pickup address"
                />
                {errors.pickupAddress && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pickupAddress.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  {...register('deliveryAddress')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter delivery address"
                />
                {errors.deliveryAddress && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.deliveryAddress.message}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pickup Date & Time *
                </label>
                <input
                  {...register('pickupDate')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                {errors.pickupDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pickupDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Date & Time
                </label>
                <input
                  {...register('deliveryDate')}
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Miles
                </label>
                <input
                  {...register('miles')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pieces
                </label>
                <input
                  {...register('pieces')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weight (lbs)
                </label>
                <input
                  {...register('weight')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="0.0"
                />
              </div>

            </div>

            {/* Load Pay and Driver Pay */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Load Pay ($)
                </label>
                <input
                  name="loadPay"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driver Pay ($)
                </label>
                <input
                  name="driverPay"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder=""
                />
              </div>
            </div>

            {/* Notes and Document */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Additional notes or special instructions"
                />
              </div>

            </div>

            {/* Document Section - Full Width */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Document
                </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Upload supporting documents (PDF, DOC, images)
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 font-medium"
                  >
                    Choose File
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  id="document-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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

                {/* Documents Table */}
                {documents.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-4">
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
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                                  <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                                    {doc.name.split('.').pop()?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {doc.size > 0 ? `${(doc.size / 1024).toFixed(1)} KB` : 'Existing document'}
                                </p>
                              </div>
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={doc.notes || ''}
                                onChange={(e) => handleDocumentNotesChange(index, e.target.value)}
                                placeholder="Add notes..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
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
                            <div className="flex items-center justify-end gap-2">
                              {doc.path && (
                                <a
                                  href={`http://localhost:3001/uploads/${doc.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  View
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(index)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                disabled={deleteDocumentMutation.isPending}
                              >
                                {deleteDocumentMutation.isPending ? 'Deleting...' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={isLoading}
                onClick={handleSubmit(
                  (data) => {
                    console.log('Form validation passed, submitting:', data)
                    onSubmit(data as OrderFormData)
                  },
                  (errors) => {
                    console.log('Form validation failed:', errors)
                    alert('Please fix the form errors. Check console for details.')
                  }
                )}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {order ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  order ? 'Update Order' : 'Create Order'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [orderNumberSearch, setOrderNumberSearch] = useState('')
  const [customerLoadSearch, setCustomerLoadSearch] = useState('')
  const [unitDriverSearch, setUnitDriverSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const queryClient = useQueryClient()
  const location = useLocation()

  console.log('Orders component rendering, location:', location)

  // Parse route-based status filtering
  useEffect(() => {
    // Map routes to status filters
    if (location.pathname === '/orders-active') {
      setStatusFilter('ASSIGNED,IN_TRANSIT')
    } else if (location.pathname === '/orders-delivered') {
      setStatusFilter('DELIVERED,CANCELLED')
    } else if (location.pathname === '/orders-pending') {
      setStatusFilter('PENDING')
    } else {
      setStatusFilter('')
    }
  }, [location.pathname])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        // Find all currently visible dropdown menus (direct children of .relative that are not hidden)
        document.querySelectorAll('.relative > div:not(.hidden)').forEach(dropdown => {
          dropdown.classList.add('hidden')
        })
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])


  const { data: ordersData, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ['orders', currentPage, orderNumberSearch, customerLoadSearch, unitDriverSearch, statusFilter, priorityFilter],
    queryFn: async (): Promise<OrdersResponse> => {
      console.log('🔵 Orders query starting...', {
        page: currentPage,
        status: statusFilter,
        priority: priorityFilter
      })
      try {
        const result = await orderService.getOrders({
          page: currentPage,
          limit: 10,
          orderNumber: orderNumberSearch,
          customerLoad: customerLoadSearch,
          unitDriver: unitDriverSearch,
          status: statusFilter,
          priority: priorityFilter
        })
        console.log('✅ Orders query successful:', result)
        // Log vehicle data for first few orders
        if (result.data && result.data.length > 0) {
          result.data.slice(0, 3).forEach((order: any) => {
            console.log(`[FRONTEND LIST] Order ${order.orderNumber}:`, {
              vehicleId: order.vehicleId,
              vehicle: order.vehicle,
              vehicle_unitNumber: order.vehicle?.unitNumber,
              vehicle_driverName: order.vehicle?.driverName,
              vehicle_licensePlate: order.vehicle?.licensePlate,
              full_vehicle_object: JSON.stringify(order.vehicle, null, 2)
            })
          })
        }
        return result
      } catch (err: any) {
        console.error('❌ Orders query failed:', err)
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        })
        toast.error(err.response?.data?.message || 'Failed to load orders')
        throw err
      }
    }
  })
  
  console.log('📊 Orders query state:', { isLoading, hasData: !!ordersData, error })

  const deleteMutation = useMutation({
    mutationFn: orderService.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete order')
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order status')
    }
  })


  const handleDelete = async (order: Order) => {
    if (window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
      await deleteMutation.mutateAsync(order.id)
    }
  }

  const handleEdit = async (order: Order) => {
    try {
      console.log('[FRONTEND EDIT] Opening order for edit:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        vehicleId: order.vehicleId,
        vehicle: order.vehicle
      })
      
      // Fetch full order data to ensure we have complete vehicle information
      const fullOrderData = await orderService.getOrder(order.id)
      
      console.log('[FRONTEND EDIT] Full order data received:', {
        orderId: fullOrderData.data.id,
        orderNumber: fullOrderData.data.orderNumber,
        vehicleId: fullOrderData.data.vehicleId,
        vehicle: fullOrderData.data.vehicle,
        vehicle_unitNumber: fullOrderData.data.vehicle?.unitNumber,
        vehicle_driverName: fullOrderData.data.vehicle?.driverName
      })
      
      setSelectedOrder(fullOrderData.data)
      setShowForm(true)
    } catch (error: any) {
      console.error('[FRONTEND EDIT] Failed to fetch order details:', error)
      toast.error('Failed to load order details')
      // Fallback to using the order from list
      setSelectedOrder(order)
      setShowForm(true)
    }
  }

  const handleAddNew = () => {
    setSelectedOrder(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedOrder(null)
  }

  const handleStatusChange = async (order: Order, newStatus: string) => {
    await statusMutation.mutateAsync({ id: order.id, status: newStatus })
  }

  const orders = (ordersData as any)?.data || []
  const pagination = (ordersData as any)?.pagination

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Track and manage all your logistics orders.
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="btn-primary min-h-[44px] px-4 py-2 text-base sm:text-sm flex items-center justify-center whitespace-nowrap"
          >
            <Plus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
            Add New Order
          </button>
        </div>
      </div>

      <div className="card p-4 sm:p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Order #"
                className="input pl-10 w-full sm:w-32 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={orderNumberSearch}
                onChange={(e) => {
                  setOrderNumberSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Customer & Load#"
                className="input pl-10 w-full sm:w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={customerLoadSearch}
                onChange={(e) => {
                  setCustomerLoadSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Unit# / Driver"
                className="input pl-10 w-full sm:w-40 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={unitDriverSearch}
                onChange={(e) => {
                  setUnitDriverSearch(e.target.value)
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
                className="input w-full sm:w-32 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              {(() => {
                const urlParams = new URLSearchParams(window.location.search)
                const statusParam = urlParams.get('status')
                
                if (statusParam === 'ASSIGNED,IN_TRANSIT') {
                  // Active group - show only ASSIGNED and IN_TRANSIT
                  return (
                    <>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_TRANSIT">In Transit</option>
                    </>
                  )
                } else if (statusParam === 'DELIVERED,CANCELLED') {
                  // Delivered group - show only DELIVERED and CANCELLED
                  return (
                    <>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </>
                  )
                } else if (statusParam === 'PENDING') {
                  // Pending group - show only PENDING
                  return (
                    <option value="PENDING">Pending</option>
                  )
                } else {
                  // Default - show all statuses
                  return (
                    <>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
                    </>
                  )
                }
              })()}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error loading orders</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 mb-2">
              There was an error loading the orders.
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Check Railway logs for detailed error information.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No orders found</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {orderNumberSearch || customerLoadSearch || unitDriverSearch || statusFilter || priorityFilter ? 'Try adjusting your search terms.' : 'Get started by creating your first order.'}
            </p>
            {!orderNumberSearch && !customerLoadSearch && !unitDriverSearch && !statusFilter && !priorityFilter && (
              <div className="mt-6">
                <button onClick={handleAddNew} className="btn-primary min-h-[44px] px-4 py-2 text-base sm:text-sm">
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                  New Order
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:mx-0 bg-white dark:bg-gray-800" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ width: 'max-content' }}>
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                      Order #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">
                      Customer & Load#
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                      Unit# / Driver
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                      Load Pay / Driver Pay
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order: Order) => {
                    const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
                    const StatusIcon = statusInfo.icon
                    // const priorityInfo = priorityConfig[order.priority]
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                            {order.orderNumber}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 dark:text-white truncate">
                            {order.customer.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {(order as any).customerLoadNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {(() => {
                              // Debug logging for first few orders
                              if (orders.indexOf(order) < 3) {
                                console.log(`[UNIT/DRIVER DEBUG] Order ${order.orderNumber}:`, {
                                  vehicleId: order.vehicleId,
                                  vehicle: order.vehicle,
                                  unitNumber: order.vehicle?.unitNumber,
                                  driverName: order.vehicle?.driverName,
                                  licensePlate: order.vehicle?.licensePlate,
                                  fullOrder: order
                                })
                              }
                              
                              // Check if vehicle exists and has data
                              const vehicle = order.vehicle
                              if (vehicle && (vehicle.unitNumber || vehicle.driverName || vehicle.licensePlate)) {
                                // Get unit number - prefer unitNumber, fallback to licensePlate
                                const unitNumber = vehicle.unitNumber 
                                  ? String(vehicle.unitNumber).trim() 
                                  : (vehicle.licensePlate ? String(vehicle.licensePlate).trim() : '');
                                
                                // Get driver name
                                const driverName = vehicle.driverName ? String(vehicle.driverName).trim() : '';
                                
                                // Format: "1 Ilia Topuria" or "1 - Ilia Topuria" if both exist
                                if (unitNumber && driverName) {
                                  return (
                                    <div className="flex items-center">
                                      <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {`${unitNumber} ${driverName}`}
                                      </span>
                                    </div>
                                  );
                                } else if (unitNumber) {
                                  return (
                                    <div className="flex items-center">
                                      <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {unitNumber}
                                      </span>
                                    </div>
                                  );
                                } else if (driverName) {
                                  return (
                                    <div className="flex items-center">
                                      <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {driverName}
                                      </span>
                                    </div>
                                  );
                                }
                              }
                              
                              // Fallback: show N/A
                              return (
                                <span className="text-gray-500 dark:text-gray-400 font-normal">
                                  N/A
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 dark:text-white">
                            <div className="font-medium">
                              Load: ${(order as any).loadPay ? (order as any).loadPay.toFixed(2) : '0.00'}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              Driver: ${(order as any).driverPay ? (order as any).driverPay.toFixed(2) : '0.00'}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 dark:text-white">
                            <div className="flex items-start">
                              <MapPin className="h-3 w-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="break-words" title={order.pickupAddress}>
                                {order.pickupAddress}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(order.pickupDate), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 dark:text-white">
                            <div className="flex items-start">
                              <MapPin className="h-3 w-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="break-words" title={order.deliveryAddress}>
                                {order.deliveryAddress}
                              </span>
                            </div>
                            {order.deliveryDate && (
                              <div className="flex items-center mt-1">
                                <Calendar className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(new Date(order.deliveryDate), 'MMM dd, HH:mm')}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium">
                          <div className="flex items-center justify-end">
                            <div className="relative">
                              <button
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const dropdown = e.currentTarget.nextElementSibling as HTMLElement
                                  dropdown.classList.toggle('hidden')
                                }}
                              >
                                Actions
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className="hidden absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                            <select
                              value={order.status}
                                      onChange={(e) => {
                                        handleStatusChange(order, e.target.value)
                                        const dropdown = e.currentTarget.closest('.hidden') as HTMLElement
                                        dropdown.classList.add('hidden')
                                      }}
                                      className="w-full mt-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              disabled={statusMutation.isPending}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="ASSIGNED">Assigned</option>
                              <option value="IN_TRANSIT">In Transit</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                                  </div>
                            <button
                                    onClick={() => {
                                      handleEdit(order)
                                      const dropdown = document.querySelector('.hidden') as HTMLElement
                                      dropdown?.classList.add('hidden')
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Order
                            </button>
                            {(order.status === 'PENDING' || order.status === 'ASSIGNED') && (
                              <button
                                      onClick={() => {
                                        handleDelete(order)
                                        const dropdown = document.querySelector('.hidden') as HTMLElement
                                        dropdown?.classList.add('hidden')
                                      }}
                                      className="flex items-center w-full px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                disabled={deleteMutation.isPending}
                              >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Order
                              </button>
                            )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-4 py-2"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={currentPage === pagination.pages}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-4 py-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Form Modal */}
      {showForm && (
        <OrderForm
          key={selectedOrder?.id || 'new'}
          order={selectedOrder || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}
    </div>
  )
}
