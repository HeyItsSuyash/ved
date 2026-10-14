'use client';

import React, { useState } from 'react';
import MmmutLogo from './MmmutLogo';

interface StudentLoginProps {
  onLoginSuccess: (username: string) => void;
}

export default function StudentLogin({ onLoginSuccess }: StudentLoginProps) {
  const [username, setUsername] = useState('2023CSD0622');
  const [password, setPassword] = useState('password123');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLoginSuccess(username.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#edf0f5] text-slate-800 font-sans antialiased">
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center">
          <h1 className="text-[#1d4ed8] text-[15px] sm:text-base font-semibold tracking-normal">
            Madan Mohan Malaviya University of Technology Gorakhpur
          </h1>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[430px] bg-white rounded-xs shadow-md border-t-[3px] border-[#2563eb] border-x border-b border-slate-200/80 px-8 py-7 sm:px-10 sm:py-8 transition-all">
          
          {/* Logo & Portal Title */}
          <div className="flex flex-col items-center text-center">
            <MmmutLogo size={115} className="mb-2" />
            <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight mt-1">
              Student Portal
            </h2>
          </div>

          {/* Sign In Form */}
          <div className="mt-7">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Sign In
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Roll Number / Enrollment ID"
                  required
                  className="w-full px-3 py-2 text-sm text-slate-800 bg-[#edf3fc] border border-blue-200 rounded-xs focus:bg-white focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] outline-none transition-colors"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 text-sm text-slate-800 bg-white border border-blue-400 rounded-xs focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-colors shadow-xs"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="submit"
                  className="w-24 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white text-xs font-semibold py-2 px-4 rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  Login
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white text-xs font-medium py-1.5 px-3 rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  New Registration
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="bg-white hover:bg-slate-50 text-[#4338ca] border border-slate-300 text-xs font-medium py-1.5 px-3 rounded-xs shadow-xs transition-colors cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-8 py-3 text-left">
        <p className="text-[13px] text-[#0284c7] font-medium tracking-wide">
          © Samarth eGov
        </p>
      </footer>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Reset Password</h3>
            <p className="text-xs text-slate-600 mb-4">
              Enter your student roll number or registered email to receive a password reset link.
            </p>
            {resetSent ? (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-xs mb-4">
                Password reset instructions have been dispatched to the registered email address for <b>{username}</b>.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Student Enrollment / Roll No.</label>
                  <input
                    type="text"
                    defaultValue={username}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registered Mobile Number / OTP</label>
                  <input
                    type="text"
                    placeholder="+91 ••••• •••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowResetModal(false); setResetSent(false); }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
              {!resetSent && (
                <button
                  type="button"
                  onClick={() => setResetSent(true)}
                  className="px-4 py-1.5 text-xs bg-[#2563eb] text-white font-medium rounded hover:bg-blue-700"
                >
                  Send OTP & Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Student Portal Registration</h3>
            <p className="text-xs text-slate-600 mb-4">
              Enter your MMMUT Admission/CUET/JEE Enrollment credentials to set up your student portal account.
            </p>
            {registerSuccess ? (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-xs mb-4">
                Account verification successful! You can now log in using your Roll Number <b>{username}</b>.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Roll / Admission Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023CSD0622"
                    defaultValue="2023CSD0622"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Program / Course</label>
                  <select className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none bg-white">
                    <option>B.Tech. Computer Science & Engg.</option>
                    <option>B.Tech. Information Technology</option>
                    <option>B.Tech. Electronics & Comm.</option>
                    <option>B.Tech. Mechanical Engg.</option>
                    <option>MCA</option>
                    <option>MBA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    defaultValue="2004-05-18"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registered Email ID</label>
                  <input
                    type="email"
                    placeholder="student@mmmut.ac.in"
                    defaultValue="student@mmmut.ac.in"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRegisterModal(false); setRegisterSuccess(false); }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
              {!registerSuccess && (
                <button
                  type="button"
                  onClick={() => setRegisterSuccess(true)}
                  className="px-4 py-1.5 text-xs bg-[#16a34a] text-white font-medium rounded hover:bg-green-700"
                >
                  Verify & Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
