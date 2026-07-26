'use client';

import { CheckCircleFilled, ExclamationCircleFilled, WarningFilled } from '@ant-design/icons';
import { Popover, Tag } from 'antd';
import type { RiskAssessment, RiskLevel } from '@/lib/types';

const LEVEL: Record<RiskLevel, { label: string; accent: string; icon: React.ReactNode }> = {
  clean: { label: 'Clean', accent: 'emerald', icon: <CheckCircleFilled /> },
  low: { label: 'Low', accent: 'cyan', icon: <ExclamationCircleFilled /> },
  suspicious: { label: 'Suspicious', accent: 'amber', icon: <WarningFilled /> },
  high: { label: 'High risk', accent: 'rose', icon: <WarningFilled /> },
};

/**
 * Risk badge with the contributing signals on hover.
 *
 * The score is heuristic triage, never a verdict, so the reasons are always one
 * hover away. A number with no explanation is not actionable.
 */
export function RiskBadge({ risk, compact = false }: { risk: RiskAssessment; compact?: boolean }) {
  const meta = LEVEL[risk.level];

  const badge = (
    <span
      className={`risk risk--${risk.level}`}
      style={{ '--accent': `var(--a-${meta.accent})`, '--accent-bg': `var(--a-${meta.accent}-bg)` } as React.CSSProperties}
    >
      {meta.icon}
      <span>{meta.label}</span>
      {!compact && <b className="tabular">{risk.score}</b>}
    </span>
  );

  if (risk.signals.length === 0) {
    return <Popover content="No abuse signals detected on this link." title="Risk assessment">{badge}</Popover>;
  }

  return (
    <Popover
      title={`Risk assessment: ${meta.label} (${risk.score}/100)`}
      placement="left"
      content={
        <div style={{ maxWidth: 320 }}>
          <ul className="risk-signals">
            {risk.signals.map((signal) => (
              <li key={signal.code}>
                <Tag color={signal.weight >= 30 ? 'error' : signal.weight >= 18 ? 'warning' : 'default'} style={{ marginInlineEnd: 0 }}>
                  +{signal.weight}
                </Tag>
                <span>{signal.label}</span>
              </li>
            ))}
          </ul>
          <p className="risk-note">Heuristic triage only. Review the destination before acting.</p>
        </div>
      }
    >
      {badge}
    </Popover>
  );
}
