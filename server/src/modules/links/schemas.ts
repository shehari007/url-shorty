import { z } from 'zod';
import { MAX_URL_LENGTH } from '../../lib/url-safety.js';

/** Aliases are user-visible, so keep them to an unambiguous character set. */
export const shortCodeSchema = z
  .string()
  .trim()
  .min(3, 'Alias must be at least 3 characters')
  .max(32, 'Alias must be 32 characters or fewer')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Alias may only contain letters, numbers, hyphens and underscores');

export const createLinkSchema = z.object({
  url: z.string().trim().min(1, 'Enter a URL to shorten').max(MAX_URL_LENGTH),
});

export type CreateLinkBody = z.infer<typeof createLinkSchema>;

/** Accepts a bare code or a full short URL, the resolver normalises it. */
export const lookupSchema = z.object({
  url: z.string().trim().min(1, 'Enter a Shorty link').max(MAX_URL_LENGTH),
});

export type LookupBody = z.infer<typeof lookupSchema>;

export const trackQrSchema = z.object({
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
});

export const codeParamSchema = z.object({
  code: shortCodeSchema,
});
