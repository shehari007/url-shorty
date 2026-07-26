import type { Metadata } from 'next';
import { ReportsManager } from '@/components/admin/ReportsManager';

export const metadata: Metadata = { title: 'Reports' };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  return <ReportsManager {...(params.status ? { initialStatus: params.status } : {})} />;
}
