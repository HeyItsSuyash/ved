'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import StudentLogin from '../../components/StudentLogin';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (userOrRoll: any) => {
    if (typeof window !== 'undefined') {
      const roll = typeof userOrRoll === 'object' && userOrRoll !== null
        ? (userOrRoll.rollNumber || userOrRoll.email || userOrRoll.name || '2023CSD0622')
        : userOrRoll;
      localStorage.setItem('mmmut_student_auth', 'true');
      localStorage.setItem('mmmut_student_roll', roll);
      if (typeof userOrRoll === 'object' && userOrRoll !== null) {
        localStorage.setItem('user', JSON.stringify(userOrRoll));
      }
    }
    router.push('/');
  };

  return <StudentLogin onLoginSuccess={handleLoginSuccess} />;
}
