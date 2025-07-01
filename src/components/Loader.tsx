
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div
      className="w-16 h-16 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin"
      role="status"
    >
        <span className="sr-only">Loading...</span>
    </div>
  );
};
