import React from 'react';
import Image from 'next/image';

interface MmmutLogoProps {
  className?: string;
  size?: number;
}

export default function MmmutLogo({ className = '', size = 110 }: MmmutLogoProps) {
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`} 
      style={{ width: size, height: size }}
    >
      <Image
        src="/Madan_Mohan_Malaviya_University_of_Technology_logo.png"
        alt="Madan Mohan Malaviya University of Technology Logo"
        width={size}
        height={size}
        priority
        className="w-full h-full object-contain drop-shadow-sm pointer-events-none"
      />
    </div>
  );
}

