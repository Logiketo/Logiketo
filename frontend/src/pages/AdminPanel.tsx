import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Clock, Users, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface PendingUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
}

// API functions
const getPendingUsers = async (): Promise<PendingUser[]> => {
  const response = await fetch('/api/auth/pending-users', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending users')
  }
  
  const data = await response.json()
  return data.data
}

const approveUser = async (userId: string): Promise<void> => {
  const response = await fetch(`/api/auth/approve-user/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to approve user')
  }
}

const rejectUser = async (userId: string): Promise<void> => {
  const response = await fetch(`/api/auth/reject-user/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to reject user')
  }
}

export default function AdminPanel() {
  const [userRole, setUserRole] = useState<string>('')
  const queryClient = useQueryClient()

  // Check user role on component mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserRole(payload.role)
      } catch (error) {
        console.error('Error decoding token:', error)
      }
    }
  }, [])

  // Fetch pending users
  const { data: pendingUsers = [], isLoading, error } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: getPendingUsers,
    enabled: userRole === 'ADMIN'
  })

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] })
      toast.success('User approved successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve user')
    }
  })

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: rejectUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] })
      toast.success('User rejected successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject user')
    }
  })

  const handleApprove = (userId: string) => {
    if (confirm('Are you sure you want to approve this user?')) {
      approveMutation.mutate(userId)
    }
  }

  const handleReject = (userId: string) => {
    if (confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
      rejectMutation.mutate(userId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Check if user is admin
  if (userRole !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          You need admin privileges to access this page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage user registrations and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{pendingUsers.length} pending users</span>
        </div>
      </div>

      {/* Pending Users */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading pending users...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error loading users
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please try refreshing the page.
          </p>
        </div>
      ) : pendingUsers.length > 0 ? (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Registered: {formatDate(user.createdAt)} • Role: {user.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {approveMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={rejectMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {rejectMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No pending users
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            All user registrations have been processed.
          </p>
        </div>
      )}
    </div>
  )
}
