import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  description?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ElementType;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  icon: HeaderIcon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full text-xs select-none ${className}`} ref={containerRef}>
      {label && (
        <label className="text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center space-x-1.5">
          {HeaderIcon && <HeaderIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
          <span>{label}</span>
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 shadow-sm ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-teal-500 dark:border-teal-500 ring-2 ring-teal-500/20 text-slate-900 dark:text-white'
            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0 pr-2">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          )}
          <span className="truncate font-semibold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-500' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 space-y-1 custom-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                  isSelected
                    ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {OptIcon && (
                    <OptIcon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-xs">{opt.label}</div>
                    {opt.description && (
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
