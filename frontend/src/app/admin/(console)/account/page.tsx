import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountPanel } from '@/components/admin/AccountPanel';
import { getCurrentAdmin } from '@/lib/server/session';

export const metadata: Metadata = { title: 'My account' };

export default async function AdminAccountPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  return <AccountPanel admin={admin} />;
}
