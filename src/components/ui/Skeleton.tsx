import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'list' | 'text' | 'circle';
  count?: number;
}

export default function Skeleton({ className, variant = 'card', count = 1 }: SkeletonProps) {
  const renderItem = (index: number) => {
    switch (variant) {
      case 'circle':
        return (
          <div
            key={index}
            className={cn('animate-pulse bg-white/5 rounded-full shrink-0', className)}
          />
        );
      case 'list':
        return (
          <div
            key={index}
            className={cn(
              'animate-pulse bg-white/5 rounded-2xl p-4 flex items-center justify-between gap-4',
              className
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
              <div className="space-y-2 w-full">
                <div className="h-3.5 bg-white/10 rounded w-1/3" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg bg-white/10 shrink-0" />
          </div>
        );
      case 'text':
        return (
          <div key={index} className={cn('animate-pulse space-y-2.5', className)}>
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/10 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-2/3" />
          </div>
        );
      case 'card':
      default:
        return (
          <div
            key={index}
            className={cn(
              'animate-pulse bg-white/[0.03] rounded-3xl p-5 flex flex-col items-center justify-center gap-3',
              className
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10" />
            <div className="h-3.5 bg-white/10 rounded w-2/3 mt-2" />
            <div className="h-2.5 bg-white/5 rounded w-1/2" />
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => renderItem(idx))}
    </>
  );
}
