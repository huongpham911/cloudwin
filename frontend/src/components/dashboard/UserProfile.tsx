import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import TwoFactorManagement from '../auth/TwoFactorManagement';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PasswordUpdateData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ProfileUpdateData {
  full_name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const { user, setUser } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileForm, setProfileForm] = useState<ProfileUpdateData>({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState<PasswordUpdateData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const isAdmin = user?.role === 'admin' || user?.is_admin === true;

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/auth/me?user_id=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const response = await api.put('/api/v1/auth/me', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully');
      setUser(data);
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordUpdateData) => {
      const response = await api.put('/users/change-password', {
        current_password: data.current_password,
        new_password: data.new_password
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    changePasswordMutation.mutate(passwordForm);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || ''
    });
  };

  const handleCancelPassword = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Profile Settings
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage your account information and security settings
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            <ShieldCheckIcon className="w-4 h-4 mr-1" />
            Admin Account
          </div>
        )}
      </div>

      {/* Account Overview */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
          Account Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <UserIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-3`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Full Name
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {profile?.full_name || 'Not provided'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <EnvelopeIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-3`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Email Address
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {profile?.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <ShieldCheckIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-3`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Role
              </p>
              <div className="flex items-center">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} capitalize`}>
                  {profile?.role}
                </span>
                {isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <CheckCircleIcon className={`w-5 h-5 ${profile?.is_active ? 'text-green-500' : 'text-red-500'} mr-3`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Account Status
              </p>
              <p className={`text-sm ${profile?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {profile?.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Profile Information
          </h2>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'} mb-2`}>
                Full Name
              </label>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'} mb-2`}>
                Email Address
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  isDark 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                Full Name
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {profile?.full_name || 'Not provided'}
              </p>
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                Email Address
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {profile?.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Password Security */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Password Security
          </h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'} mb-2`}>
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'} mb-2`}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'} mb-2`}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {passwordForm.new_password && passwordForm.confirm_password && 
             passwordForm.new_password !== passwordForm.confirm_password && (
              <div className="flex items-center text-red-600 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                Passwords do not match
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending || passwordForm.new_password !== passwordForm.confirm_password}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={handleCancelPassword}
                className={`px-4 py-2 border rounded-md transition-colors ${
                  isDark 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center">
            <KeyIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-3`} />
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Password
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Last changed: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        )}

        {/* Two-Factor Authentication Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
          <TwoFactorManagement />
        </div>
      </div>

      {/* Account Actions */}
      {isAdmin && (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            Admin Actions
          </h2>
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Administrator Account
              </p>
              <p className="text-xs text-yellow-600">
                You have administrative privileges. Use responsibly.
              </p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
