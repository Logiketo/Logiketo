import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, AlertCircle, UserPlus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const ROLES = ['USER', 'MANAGER', 'DISPATCHER', 'DRIVER'] as const
const NEW_USERS_DAYS = 30

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  isApproved: boolean
  createdAt: string
}

const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get('/auth/all-users')
  return response.data.data
}

const createUser = async (data: { email: string; password: string; firstName: string; lastName: string; role: string }) => {
  const response = await api.post('/auth/create-user', data)
  return response.data
}

const updateUser = async (userId: string, data: Partial<User> & { password?: string }) => {
  const response = await api.put(`/auth/update-user/${userId}`, data)
  return response.data
}

const deleteUser = async (userId: string) => {
  await api.delete(`/auth/delete-user/${userId}`)
}

export default function AdminPanel() {
  const [userRole, setUserRole] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'active' | 'paused'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const queryClient = useQueryClient()

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'USER'
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    isActive: true,
    isApproved: true,
    newPassword: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserRole(payload.role)
      } catch {
        console.error('Error decoding token')
      }
    }
  }, [])

  const { data: allUsers = [], isLoading, error } = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers,
    enabled: userRole === 'ADMIN'
  })

  const filteredUsers = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - NEW_USERS_DAYS * 24 * 60 * 60 * 1000)

    switch (activeTab) {
      case 'new':
        return allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo)
      case 'active':
        return allUsers.filter(u => u.isActive)
      case 'paused':
        return allUsers.filter(u => !u.isActive)
      default:
        return allUsers
    }
  }, [allUsers, activeTab])

  const tabCounts = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - NEW_USERS_DAYS * 24 * 60 * 60 * 1000)
    return {
      all: allUsers.length,
      new: allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length,
      active: allUsers.filter(u => u.isActive).length,
      paused: allUsers.filter(u => !u.isActive).length
    }
  }, [allUsers])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] })
      toast.success('User created successfully')
      setShowCreateModal(false)
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: 'USER' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create user')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] })
      toast.success('User updated successfully')
      setEditingUser(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] })
      toast.success('User deleted permanently')
      setEditingUser(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
      toast.error('Please fill all required fields')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const data: any = {
      email: editForm.email,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      isActive: editForm.isActive,
      isApproved: editForm.isApproved
    }
    if (editingUser.role !== 'ADMIN') data.role = editForm.role
    if (editForm.newPassword) data.password = editForm.newPassword
    updateMutation.mutate({ userId: editingUser.id, data })
  }

  const handleDeleteForever = () => {
    if (!editingUser) return
    if (!confirm('Delete this user forever? This cannot be undone.')) return
    deleteMutation.mutate(editingUser.id)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role === 'ADMIN' ? 'USER' : user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      newPassword: ''
    })
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

  if (userRole !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-300">You need admin privileges to access this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Create and manage users.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Add New User
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap gap-4">
          {[
            { id: 'all' as const, label: 'All Users', icon: Users },
            { id: 'new' as const, label: 'New Users', icon: UserPlus },
            { id: 'active' as const, label: 'Active Users', icon: UserCheck },
            { id: 'paused' as const, label: 'Paused Users', icon: UserX }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label} ({id === 'all' ? tabCounts.all : id === 'new' ? tabCounts.new : id === 'active' ? tabCounts.active : tabCounts.paused})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error loading users</h3>
          <p className="text-gray-600 dark:text-gray-300">Please try refreshing the page.</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  user.isActive ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {user.isActive ? (
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <UserX className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user.role}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {user.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Joined {formatDate(user.createdAt)}
                </p>
                <button
                  onClick={() => openEditModal(user)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
          <p className="text-gray-600 dark:text-gray-300">
            {activeTab === 'all' ? 'No users yet. Click "Add New User" to create one.' : `No ${activeTab} users.`}
          </p>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New User</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  minLength={6}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit User</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Passwords are stored securely (hashed) and cannot be viewed. You can set a new password for this user below.
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  minLength={6}
                  placeholder="Enter new password or leave blank"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              {editingUser.role !== 'ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isApproved}
                    onChange={(e) => setEditForm({ ...editForm, isApproved: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Approved</span>
                </label>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {editingUser.role !== 'ADMIN' && (
                  <button
                    type="button"
                    onClick={handleDeleteForever}
                    disabled={deleteMutation.isPending}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Forever
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
