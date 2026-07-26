import type { Metadata } from 'next';
import { DomainsManager } from '@/components/admin/DomainsManager';

export const metadata: Metadata = { title: 'Blocked domains' };

export default function AdminDomainsPage() {
  return <DomainsManager />;
}
