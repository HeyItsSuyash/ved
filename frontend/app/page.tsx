'use client';

import React, { useState, useEffect } from 'react';
import StudentLogin from '../components/StudentLogin';
import StudentDashboard from '../components/StudentDashboard';

export default function StudentPortalRoot() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentRoll, setStudentRoll] = useState('2023CSD0622');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAuth = localStorage.getItem('mmmut_student_auth');
    const storedRoll = localStorage.getItem('mmmut_student_roll');
    const storedUser = localStorage.getItem('user');

    if (storedAuth === 'true' && (storedRoll || storedUser)) {
      setIsLoggedIn(true);
      if (storedRoll) setStudentRoll(storedRoll);
      if (storedUser) {
        try {
          setUserProfile(JSON.parse(storedUser));
        } catch {
          // ignore corrupted json
        }
      }
    }
  }, []);

  const handleLogin = (userOrRoll: any) => {
    setIsLoggedIn(true);
    let roll = '2023CSD0622';
    if (typeof userOrRoll === 'object' && userOrRoll !== null) {
      setUserProfile(userOrRoll);
      roll = userOrRoll.rollNumber || userOrRoll.email || userOrRoll.name || '2023CSD0622';
    } else if (typeof userOrRoll === 'string') {
      roll = userOrRoll;
    }
    setStudentRoll(roll);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mmmut_student_auth', 'true');
      localStorage.setItem('mmmut_student_roll', roll);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mmmut_student_auth');
      localStorage.removeItem('mmmut_student_roll');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf0f5]">
        <div className="text-slate-400 text-xs font-medium">Loading Admission Support Portal...</div>
      </div>
    );
  }

  return (
    <>
      {isLoggedIn ? (
        <StudentDashboard
          studentRoll={studentRoll}
          initialUser={userProfile}
          onLogout={handleLogout}
        />
      ) : (
        <StudentLogin
          onLoginSuccess={handleLogin}
        />
      )}
    </>
  );
}
