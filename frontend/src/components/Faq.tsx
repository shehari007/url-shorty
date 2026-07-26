'use client';

import { Collapse } from 'antd';

/**
 * Client island for the accordion. The questions and answers are also emitted
 * as FAQPage JSON-LD from the page itself, so search engines see the content
 * regardless of the collapsed state.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Collapse
      accordion
      bordered={false}
      items={items.map((item, index) => ({
        key: String(index),
        label: <span style={{ fontWeight: 600 }}>{item.q}</span>,
        children: <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{item.a}</p>,
      }))}
    />
  );
}
