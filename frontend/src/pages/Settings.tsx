import { useState, useEffect } from 'react'
import { User, Camera, Phone, Mail, MapPin, Save, Eye, EyeOff } from 'lucide-react'

export default function Settings() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
    firstName: 'Davit',
    lastName: 'Gordeladze',
    email: 'davit.gordeladze@logiketo.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, New York, NY 10001',
    profilePicture: null as string | null
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null)

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      // Convert file to base64 for permanent storage
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        setProfileData(prev => ({
          ...prev,
          profilePicture: base64String
        }))
      }
      reader.readAsDataURL(file)
      
      console.log('Profile picture selected:', file)
    }
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Save profile data to localStorage (including base64 image)
    localStorage.setItem('logiketo-profile', JSON.stringify(profileData))
    
    console.log('Profile saved successfully:', profileData)
    alert('Profile saved successfully! Your changes have been saved.')
    
    // If you need to upload to server, you can convert base64 back to file
    if (profileData.profilePicture && profileData.profilePicture.startsWith('data:')) {
      // Convert base64 to file for server upload (if needed)
      const base64Data = profileData.profilePicture.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const file = new File([byteArray], 'profile-picture.jpg', { type: 'image/jpeg' })
      
      // Here you can upload the file to your server if needed
      console.log('File ready for server upload:', file)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    if (!passwordData.currentPassword) {
      alert('Please enter your current password')
      return
    }
    
    try {
      // Call backend API to change password
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Save timestamp to localStorage for display
        const passwordDataToSave = {
          lastChanged: new Date().toISOString()
        }
        localStorage.setItem('logiketo-password', JSON.stringify(passwordDataToSave))
        setLastPasswordChange(passwordDataToSave.lastChanged)
        
        alert('Password changed successfully!')
        
        // Clear the form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        alert(result.message || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Error changing password. Please try again.')
    }
  }

  // Load saved profile data on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('logiketo-profile')
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile)
        setProfileData(parsedProfile)
      } catch (error) {
        console.error('Error loading saved profile:', error)
      }
    }
    
    // Load saved password data
    const savedPassword = localStorage.getItem('logiketo-password')
    if (savedPassword) {
      try {
        const parsedPassword = JSON.parse(savedPassword)
        setLastPasswordChange(parsedPassword.lastChanged)
      } catch (error) {
        console.error('Error loading saved password data:', error)
      }
    }
  }, [])

  // No cleanup needed for base64 strings

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Manage your profile information and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <User className="h-6 w-6 text-blue-600" />
            <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                  {profileData.profilePicture ? (
                    <img 
                      src={profileData.profilePicture} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors duration-200">
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Profile Picture</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Click camera icon to upload</p>
                {profileData.profilePicture && (
                  <p className="text-xs text-green-600 dark:text-green-400">✓ Image uploaded</p>
                )}
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="input"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                className="input"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Address
              </label>
              <textarea
                value={profileData.address}
                onChange={(e) => handleProfileChange('address', e.target.value)}
                className="input"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Profile
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <User className="h-6 w-6 text-green-600" />
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
            </div>
            {lastPasswordChange && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last changed: {new Date(lastPasswordChange).toLocaleDateString()}
              </p>
            )}
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
