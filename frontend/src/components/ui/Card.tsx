/* Card Component */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = ({ children, className = '', padding = 'md' }: CardProps) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader = ({ title, description, action, className = '' }: CardHeaderProps) => (
  <div className={`flex items-start justify-between mb-4 ${className}`}>
    <div>
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-0.5">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);