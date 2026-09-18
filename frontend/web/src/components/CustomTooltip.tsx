import React, { useState } from 'react';

interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'center' | 'left' | 'right';
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  let posClass = '';
  let arrowClass = '';

  if (position === 'top') {
    posClass = 'bottom-full mb-2';
    if (align === 'right') {
      posClass += ' right-0';
      arrowClass = 'top-full right-3 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent';
    } else if (align === 'left') {
      posClass += ' left-0';
      arrowClass = 'top-full left-3 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent';
    } else {
      posClass += ' left-1/2 -translate-x-1/2';
      arrowClass = 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent';
    }
  } else if (position === 'bottom') {
    posClass = 'top-full mt-2';
    if (align === 'right') {
      posClass += ' right-0';
      arrowClass = 'bottom-full right-3 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent';
    } else if (align === 'left') {
      posClass += ' left-0';
      arrowClass = 'bottom-full left-3 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent';
    } else {
      posClass += ' left-1/2 -translate-x-1/2';
      arrowClass = 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent';
    }
  } else if (position === 'left') {
    posClass = 'right-full top-1/2 -translate-y-1/2 mr-2';
    arrowClass = 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800 border-y-transparent border-r-transparent';
  } else if (position === 'right') {
    posClass = 'left-full top-1/2 -translate-y-1/2 ml-2';
    arrowClass = 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800 border-y-transparent border-l-transparent';
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          className={`absolute ${posClass} z-[60] pointer-events-none transition-all duration-150 transform scale-100 opacity-100`}
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap border border-slate-700/60 dark:border-slate-700 max-w-xs text-center">
            {content}
          </div>
          <div className={`absolute w-0 h-0 border-4 ${arrowClass}`} />
        </div>
      )}
    </div>
  );
};
