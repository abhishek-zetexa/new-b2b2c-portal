"use client";

import { useState, type ReactNode } from "react";

export function Tooltip({
  content,
  children,
  className = "",
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 whitespace-normal rounded-xl border border-line bg-navy px-2.5 py-1.5 text-left text-xs font-medium leading-5 text-white shadow-md pointer-events-none"
        >
          {content}
          <div className="absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-navy" />
        </div>
      ) : null}
    </div>
  );
}

