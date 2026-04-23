"use client";

export function Skeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-28 animate-pulse" />
          <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}
