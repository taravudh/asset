import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ToolbarButtonProps {
  icon: React.ComponentType<any>;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
  title
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default ToolbarButton;