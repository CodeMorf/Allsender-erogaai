import React from 'react';
import { ExpenseStatus } from '../types.js';
import { getStatusDetails } from '../utils/formatters.js';

interface StatusBadgeProps {
  status: ExpenseStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const details = getStatusDetails(status);

  return (
    <span
      id={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${details.bg} ${details.text} ${details.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${details.dot}`} />
      <span className="whitespace-nowrap">{details.label}</span>
    </span>
  );
};
