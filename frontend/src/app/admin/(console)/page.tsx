import type { Metadata } from 'next';
import { Dashboard } from '@/components/admin/Dashboard';

export const metadata: Metadata = { title: 'Overview' };

export default function AdminOverviewPage() {
  return <Dashboard />;
}
