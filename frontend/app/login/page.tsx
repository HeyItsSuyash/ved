'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import StudentLogin from '../../components/StudentLogin';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (username: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mmmut_student_auth', 'true');
      localStorage.setItem('mmmut_student_roll', username);
    }
    router.push('/');
  };

  return <StudentLogin onLoginSuccess={handleLoginSuccess} />;
}
