import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountsManager } from '@/components/admin/AccountsManager';
import { getCurrentAdmin } from '@/lib/server/session';

export const metadata: Metadata = { title: 'Admin accounts' };

export default async function AdminAccountsPage() {
  const admin = await getCurrentAdmin();
  // Managing admins is owner-only; the API enforces this too.
  if (!admin) redirect('/admin/login');
  if (admin.role !== 'owner') redirect('/admin');

  return <AccountsManager currentAdmin={admin} />;
}
