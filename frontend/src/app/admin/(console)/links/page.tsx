import type { Metadata } from 'next';
import { LinksManager } from '@/components/admin/LinksManager';

export const metadata: Metadata = { title: 'Links' };

// Next.js 16: searchParams is async and must be awaited.
export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const params = await searchParams;

  return (
    <LinksManager
      {...(params.status ? { initialStatus: params.status } : {})}
      {...(params.search ? { initialSearch: params.search } : {})}
    />
  );
}
