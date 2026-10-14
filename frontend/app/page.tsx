'use client';

import React, { useState, useEffect } from 'react';
import StudentLogin from '../components/StudentLogin';
import StudentDashboard from '../components/StudentDashboard';

export default function StudentPortalRoot() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentRoll, setStudentRoll] = useState('2023CSD0622');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAuth = localStorage.getItem('mmmut_student_auth');
    const storedRoll = localStorage.getItem('mmmut_student_roll');
    if (storedAuth === 'true' && storedRoll) {
      setIsLoggedIn(true);
      setStudentRoll(storedRoll);
    }
  }, []);

  const handleLogin = (roll: string) => {
    setIsLoggedIn(true);
    setStudentRoll(roll);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mmmut_student_auth', 'true');
      localStorage.setItem('mmmut_student_roll', roll);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mmmut_student_auth');
      localStorage.removeItem('mmmut_student_roll');
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf0f5]">
        <div className="text-slate-400 text-xs font-medium">Loading Student Portal...</div>
      </div>
    );
  }

  return (
    <>
      {isLoggedIn ? (
        <StudentDashboard
          studentRoll={studentRoll}
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
