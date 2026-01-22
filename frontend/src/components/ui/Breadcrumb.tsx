'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2', className)}>
      {showHome && (
        <>
          <Link
            href="/"
            className="text-neutral-400 hover:text-cyan-400 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
          )}
        </>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
          )}
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-neutral-400 hover:text-cyan-400 transition-colors text-sm"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-white text-sm font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
