import React from 'react';
import { ExpenseClassification } from '../types.js';
import { getClassificationDetails } from '../utils/formatters.js';
import { Briefcase, ShoppingBag, Box, Landmark } from 'lucide-react';

interface ClassificationBadgeProps {
  classification: ExpenseClassification;
  showIcon?: boolean;
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({ 
  classification, 
  showIcon = true 
}) => {
  const details = getClassificationDetails(classification);

  const getIcon = () => {
    switch (classification) {
      case 'GASTO_OPERATIVO':
        return <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'COSTO_VENTA':
        return <ShoppingBag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
      case 'COMPRA_INVENTARIO':
        return <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'ACTIVO_FIJO':
        return <Landmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <span
      id={`classification-badge-${classification.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${details.badgeClass}`}
      title={details.desc}
    >
      {showIcon && getIcon()}
      <span className="whitespace-nowrap">{details.label}</span>
    </span>
  );
};
