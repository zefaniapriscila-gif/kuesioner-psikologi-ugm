import React from "react";

// A sugar cube seen from above: lit top, left face in half light, right in shade
export const CubeMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 22" aria-hidden="true">
    <path d="M10 1.5 18.5 6.25 10 11 1.5 6.25Z" fill="var(--cube-top)" />
    <path d="M1.5 6.25 10 11v9.5l-8.5-4.75Z" fill="var(--cube-left)" />
    <path d="M18.5 6.25 10 11v9.5l8.5-4.75Z" fill="var(--cube-right)" />
    <path
      d="M10 1.5l8.5 4.75v9.5L10 20.5l-8.5-4.75v-9.5ZM1.5 6.25 10 11l8.5-4.75M10 11v9.5"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.42"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);
