import type { Metadata } from 'next';
import { ContactsManager } from '@/components/admin/ContactsManager';

export const metadata: Metadata = { title: 'Messages' };

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  return <ContactsManager {...(params.status ? { initialStatus: params.status } : {})} />;
}
