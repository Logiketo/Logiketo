import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, AlertCircle, UserPlus, Pencil, Trash2, UserCheck, UserX, History, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const ROLES = ['USER', 'MANAGER', 'DISPATCHER', 'DRIVER'] as const
const NEW_USERS_DAYS = 30

interface LoginSession {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  location: string | null
  createdAt: string
  user: { email: string; firstName: string; lastName: string }
}

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

type MainTab = 'users' | 'login-history' | 'site-content'

export default function AdminPanel() {
  const [userRole, setUserRole] = useState<string>('')
  const [mainTab, setMainTab] = useState<MainTab>('users')
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

  const { data: loginSessions = [], isLoading: loadingLogins } = useQuery({
    queryKey: ['loginHistory'],
    queryFn: async () => {
      const res = await api.get('/auth/login-history')
      return res.data.data
    },
    enabled: userRole === 'ADMIN' && mainTab === 'login-history'
  })

  const { data: siteContent = {}, isLoading: loadingContent } = useQuery({
    queryKey: ['siteContent'],
    queryFn: async () => {
      const res = await api.get('/content')
      return res.data.data || {}
    },
    enabled: userRole === 'ADMIN' && mainTab === 'site-content'
  })

  const contentUpdateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put('/content', { key, value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteContent'] })
      toast.success('Content saved')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save')
  })

  const contentBulkMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      await api.put('/content/bulk', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteContent'] })
      queryClient.invalidateQueries({ queryKey: ['aboutContent'] })
      toast.success('About content saved')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save')
  })

  const [contentForm, setContentForm] = useState<Record<string, string>>({})

  const contentDefaults = {
    motivation_quote: 'When the why is clear, the how is easy',
    about_intro: 'LogiKeto is a load management and dispatch platform built for dispatchers who need efficient operations and real-time tracking.',
    about_p1: 'We streamline logistics with load management, dispatch tools, interactive maps, fleet management, and actionable reports. Our platform helps you add and save loads, assign drivers, track deliveries, and optimize your operations—all in one place.',
    about_p2: 'Logiketo was created by an experienced team with real hands-on knowledge of the dispatching and logistics industry. After years of working in the field, we saw the same challenges come up again and again—too many disconnected tools, too much manual work, scattered information, and unnecessary day-to-day chaos. Logiketo was built to solve those problems with a practical platform designed around real operational needs.',
    about_p3: 'Our goal was to bring the most important parts of a logistics business into one clear, easy-to-use system. Whether you are managing a small team or a growing fleet, Logiketo is designed to save time, keep operations organized, and help teams make faster, smarter decisions.',
    about_p4: ''
  }

  useEffect(() => {
    if (mainTab === 'site-content') {
      setContentForm({
        motivation_quote: siteContent.motivation_quote ?? contentDefaults.motivation_quote,
        about_intro: siteContent.about_intro ?? contentDefaults.about_intro,
        about_p1: siteContent.about_p1 ?? contentDefaults.about_p1,
        about_p2: siteContent.about_p2 ?? contentDefaults.about_p2,
        about_p3: siteContent.about_p3 ?? contentDefaults.about_p3,
        about_p4: siteContent.about_p4 ?? contentDefaults.about_p4
      })
    }
  }, [mainTab, siteContent])

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
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['allUsers'] })
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
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['allUsers'] })
      toast.success('User updated successfully')
      setEditingUser(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['allUsers'] })
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
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {mainTab === 'users' && 'Create and manage users.'}
            {mainTab === 'login-history' && 'View when and from where users logged in.'}
            {mainTab === 'site-content' && 'Edit motivational quote and About page content.'}
          </p>
        </div>
        {mainTab === 'users' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            Add New User
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap gap-4">
          {[
            { id: 'users' as const, label: 'Users', icon: Users },
            { id: 'login-history' as const, label: 'Login History', icon: History },
            { id: 'site-content' as const, label: 'Site Content', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                mainTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Login History */}
      {mainTab === 'login-history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loadingLogins ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading login history...</p>
            </div>
          ) : loginSessions.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">No login sessions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">When</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device/Browser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loginSessions.map((s: LoginSession) => (
                    <tr key={s.id} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {s.user?.firstName} {s.user?.lastName} ({s.user?.email})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{s.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">{s.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={s.userAgent || ''}>{s.userAgent || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Site Content */}
      {mainTab === 'site-content' && (
        <div className="space-y-8">
          {loadingContent ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading content...</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Motivational Quote (Dashboard)</h3>
                <textarea
                  value={contentForm.motivation_quote ?? ''}
                  onChange={(e) => setContentForm({ ...contentForm, motivation_quote: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="When the why is clear, the how is easy"
                />
                <button
                  onClick={() => contentUpdateMutation.mutate({ key: 'motivation_quote', value: contentForm.motivation_quote ?? '' })}
                  disabled={contentUpdateMutation.isPending}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Save Quote
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About Page Content</h3>
                <div className="space-y-4">
                  {[
                    { key: 'about_intro', label: 'Intro paragraph' },
                    { key: 'about_p1', label: 'Paragraph 1' },
                    { key: 'about_p2', label: 'Paragraph 2' },
                    { key: 'about_p3', label: 'Paragraph 3' },
                    { key: 'about_p4', label: 'Paragraph 4' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <textarea
                        value={contentForm[key] ?? ''}
                        onChange={(e) => setContentForm({ ...contentForm, [key]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => contentBulkMutation.mutate({
                      about_intro: contentForm.about_intro ?? '',
                      about_p1: contentForm.about_p1 ?? '',
                      about_p2: contentForm.about_p2 ?? '',
                      about_p3: contentForm.about_p3 ?? '',
                      about_p4: contentForm.about_p4 ?? ''
                    })}
                    disabled={contentBulkMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Save About Content
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Users: Sub-tabs and Content */}
      {mainTab === 'users' && (
        <>
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
        </>
      )}
    </div>
  )
}
