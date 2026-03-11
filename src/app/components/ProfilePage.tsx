import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { User, Mail, LogOut, Camera, Lock } from 'lucide-react';

export function ProfilePage() {
  const { user, authLoading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarStatus, setAvatarStatus] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.avatarUrl]);

  if (authLoading || !user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setAvatarStatus('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus('Image size must be 5MB or less.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarStatus('');

    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrlData.publicUrl },
      });

      if (updateUserError) {
        throw updateUserError;
      }

      await refreshUser();
      setAvatarUrl(publicUrlData.publicUrl);
      setAvatarStatus('Profile picture updated successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Upload failed.';
      const normalizedMessage = message.toLowerCase();
      if (
        normalizedMessage.includes('bucket') &&
        normalizedMessage.includes('not found')
      ) {
        setAvatarStatus(
          'Avatar storage is not configured yet. Run supabase/setup-avatars-storage.sql in your Supabase SQL Editor.',
        );
      } else {
        setAvatarStatus(message);
      }
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setPasswordStatus('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordStatus(error.message);
      setIsUpdatingPassword(false);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordStatus('Password changed successfully.');
    setIsUpdatingPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Profile & Settings</h2>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                <p className="text-sm text-gray-600">View and manage your account details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{user.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center">
                <label className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
                  <Camera className="w-4 h-4 mr-2" />
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              {avatarStatus && (
                <p className="text-sm text-gray-600 mt-2">{avatarStatus}</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Change Password
              </h4>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              {passwordStatus && (
                <p className="text-sm text-gray-600 mt-3">{passwordStatus}</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Account Actions</h4>
              
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Life Admin Manager</h3>
          <p className="text-sm text-blue-800">
            Life Admin Manager helps college students stay organized with tasks, documents, 
            deadlines, and reminders. Stay on top of your academic and personal life with ease.
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Version 1.0.0 • Made for students, by students
          </p>
        </div>
      </div>
    </div>
  );
}
