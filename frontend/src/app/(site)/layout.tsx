import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

/**
 * Plain semantic markup rather than antd's `Layout`.
 *
 * antd components call `React.createContext`, which does not exist in the
 * React Server Components runtime. And this shell needs no interactivity, so
 * skipping antd here also means shipping no JavaScript for it.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
