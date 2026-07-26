import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { getCurrentAdmin } from '@/lib/server/session';

// The console reflects live moderation state; nothing here may be cached.
export const dynamic = 'force-dynamic';

/**
 * Server-side authorisation gate.
 *
 * `proxy.ts` only checks that a cookie is present. This actually validates the
 * session against the API, so a forged or expired cookie cannot render the
 * console shell.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
