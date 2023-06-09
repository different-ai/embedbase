"use client"
import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { PrimaryButton } from './Button';
import { Input } from './Input';

export default function Account({ user, profile, updateProfile }) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string>(profile.username);

  const onUpdateProfile = () => {
    setLoading(true);
    updateProfile({ username })
      .then((e) => {
        if (e) toast.error('Error updating profile ' + e);
        else toast.success('Profile updated');
      })
      .catch((e) => {
        console.error(e);
        toast.error('Error updating profile');
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="container max-w-4xl mx-auto my-12">
      <Toaster />

      <div className="bg-white dark:bg-gray-900 shadow-md rounded-lg">
        <div className="border-b border-[#912ee8] border-opacity-25 px-2 py-4">
          <ul className="flex gap-5">
            <li>
              <button
                className="block py-4 text-center text-gray-700 font-semibold border-b-4"
              >
                General
              </button>
            </li>
            <li>
              <button
                className="block py-4 text-center text-gray-500 font-semibold"
                disabled
              >
                Team (coming soon)
              </button>
            </li>
          </ul>
        </div>
        <div className="px-10 py-8">
          <div className="mb-6">
            <h1 className="text-3xl mb-4">Account settings</h1>
            <label htmlFor="email" className="text-lg text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="text"
              value={user?.email}
              disabled
              className="w-full"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="username" className="text-lg text-gray-700">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username || ''}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <PrimaryButton
              onClick={onUpdateProfile}
              disabled={loading}
            >
              {loading ? 'Loading ...' : 'Update'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}