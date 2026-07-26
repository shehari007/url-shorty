import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Shorty Admin' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/**
 * Bare pass-through. `/admin/login` renders standalone, while everything under
 * `(console)` gets the authenticated shell from its own layout.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
