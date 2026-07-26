'use client';

import {
  BarChartOutlined,
  CheckCircleFilled,
  ClearOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  LinkOutlined,
  QrcodeOutlined,
  ScissorOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Empty, Input, Modal, Popconfirm, QRCode, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { hostOf, prettyUrl, timeAgo } from '@/lib/format';
import type { PublicLink } from '@/lib/types';

const { Text } = Typography;

const HISTORY_KEY = 'shorty:history:v3';
const HISTORY_LIMIT = 15;

interface HistoryEntry {
  code: string;
  shortUrl: string;
  destination: string;
  createdAt: string;
}

function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]).filter((entry) => entry?.shortUrl) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // Private browsing / quota exceeded, history is a convenience, not a requirement.
  }
}

export function Shortener() {
  const { message } = App.useApp();

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicLink | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [qrTarget, setQrTarget] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const submit = useCallback(async () => {
    const url = value.trim();
    if (!url) {
      message.warning('Paste a link to shorten first');
      return;
    }

    setLoading(true);
    try {
      // Be forgiving about a missing scheme, people paste bare domains.
      const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      const link = await api.createLink(normalised);

      setResult(link);
      setValue('');

      setHistory((current) => {
        const next = [
          { code: link.code, shortUrl: link.shortUrl, destination: link.destination, createdAt: new Date().toISOString() },
          ...current.filter((entry) => entry.shortUrl !== link.shortUrl),
        ].slice(0, HISTORY_LIMIT);
        writeHistory(next);
        return next;
      });

      message.success(link.reused ? 'You already shortened this link, here it is again' : 'Short link ready');
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [value, message]);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        message.success('Copied to clipboard');
      } catch {
        message.error('Could not copy, select the link and copy it manually');
      }
    },
    [message],
  );

  const share = useCallback(
    async (url: string) => {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'Shorty link', url });
          return;
        } catch {
          // User dismissed the share sheet, fall through to copying.
        }
      }
      void copy(url);
    },
    [copy],
  );

  const downloadQr = useCallback(
    async (url: string) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#shorty-qr canvas');
      if (!canvas) {
        message.error('QR code is not ready yet');
        return;
      }

      const anchor = document.createElement('a');
      anchor.download = `shorty-${url.split('/').pop() ?? 'qr'}.png`;
      anchor.href = canvas.toDataURL('image/png');
      anchor.click();

      void api.trackQr(url);
      message.success('QR code downloaded');
    },
    [message],
  );

  const removeEntry = useCallback((shortUrl: string) => {
    setHistory((current) => {
      const next = current.filter((entry) => entry.shortUrl !== shortUrl);
      writeHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory([]);
    setHistory([]);
    message.success('History cleared');
  }, [message]);

  return (
    <>
      <div className="shortener">
        <Card className="shortener__card" variant="borderless">
          <div className="shortener__row">
            <Input
              size="large"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onPressEnter={submit}
              placeholder="Paste a long link, e.g. https://example.com/very/long/path"
              prefix={<LinkOutlined style={{ color: 'var(--text-muted)' }} />}
              aria-label="URL to shorten"
              allowClear
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
            <Button
              type="primary"
              size="large"
              onClick={submit}
              loading={loading}
              icon={<ScissorOutlined />}
              style={{ paddingInline: 26 }}
            >
              Shorten
            </Button>
          </div>

          {result && (
            <div className="result" ref={resultRef} role="status" aria-live="polite">
              <span className="result__label">
                <CheckCircleFilled style={{ color: 'var(--success)', marginRight: 6 }} />
                Your short link
              </span>

              <div className="result__url">
                <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">
                  {result.shortUrl.replace(/^https?:\/\//, '')}
                </a>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Tooltip title="Copy link">
                    <Button icon={<CopyOutlined />} onClick={() => void copy(result.shortUrl)} aria-label="Copy link" />
                  </Tooltip>
                  <Tooltip title="Show QR code">
                    <Button
                      icon={<QrcodeOutlined />}
                      onClick={() => setQrTarget(result.shortUrl)}
                      aria-label="Show QR code"
                    />
                  </Tooltip>
                  <Tooltip title="Share">
                    <Button icon={<ShareAltOutlined />} onClick={() => void share(result.shortUrl)} aria-label="Share" />
                  </Tooltip>
                  <Tooltip title="View analytics">
                    <Link href={`/analytics?url=${encodeURIComponent(result.shortUrl)}`}>
                      <Button icon={<BarChartOutlined />} aria-label="View analytics" />
                    </Link>
                  </Tooltip>
                </div>
              </div>

              <div className="result__meta">
                <span title={result.destination}>
                  <strong>Destination:</strong> {prettyUrl(result.destination, 52)}
                </span>
                <span>
                  <strong>Saved:</strong>{' '}
                  {Math.max(0, result.destination.length - result.shortUrl.length)} characters
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {history.length > 0 && (
        <section className="section" aria-labelledby="recent-links-heading" style={{ paddingBlock: '8px 0' }}>
          <div className="container-narrow" style={{ paddingInline: 0 }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <Text strong id="recent-links-heading" style={{ fontSize: 15 }}>
                <HistoryOutlined style={{ marginRight: 8 }} />
                Your recent links
              </Text>
              <Popconfirm
                title="Clear your link history?"
                description="This only removes them from this browser. The links keep working."
                okText="Clear"
                okButtonProps={{ danger: true }}
                onConfirm={clearHistory}
              >
                <Button type="text" size="small" danger icon={<ClearOutlined />}>
                  Clear
                </Button>
              </Popconfirm>
            </div>

            <div className="stack gap-8">
              {history.map((entry) => (
                <div className="history-item" key={entry.shortUrl}>
                  <div className="history-item__body">
                    <a
                      className="history-item__short"
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                    <div className="history-item__dest" title={entry.destination}>
                      {hostOf(entry.destination)} · {timeAgo(entry.createdAt)}
                    </div>
                  </div>

                  <div className="history-item__actions">
                    <Tooltip title="Copy">
                      <Button size="small" icon={<CopyOutlined />} onClick={() => void copy(entry.shortUrl)} aria-label="Copy" />
                    </Tooltip>
                    <Tooltip title="QR code">
                      <Button size="small" icon={<QrcodeOutlined />} onClick={() => setQrTarget(entry.shortUrl)} aria-label="QR code" />
                    </Tooltip>
                    <Tooltip title="Analytics">
                      <Link href={`/analytics?url=${encodeURIComponent(entry.shortUrl)}`}>
                        <Button size="small" icon={<BarChartOutlined />} aria-label="Analytics" />
                      </Link>
                    </Tooltip>
                    <Tooltip title="Remove from history">
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeEntry(entry.shortUrl)}
                        aria-label="Remove from history"
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Modal
        open={qrTarget !== null}
        onCancel={() => setQrTarget(null)}
        footer={null}
        centered
        title="QR code"
        destroyOnHidden
      >
        {qrTarget ? (
          <div style={{ textAlign: 'center' }}>
            <div id="shorty-qr" style={{ display: 'inline-block', marginBlock: 8 }}>
              <QRCode value={qrTarget} size={200} bordered errorLevel="M" />
            </div>
            <Text className="mono" style={{ display: 'block', wordBreak: 'break-all', marginBottom: 18 }}>
              {qrTarget}
            </Text>
            <Button type="primary" block icon={<DownloadOutlined />} onClick={() => void downloadQr(qrTarget)}>
              Download PNG
            </Button>
          </div>
        ) : (
          <Empty />
        )}
      </Modal>
    </>
  );
}
