import { and, count, gte, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { contacts } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { sendCreated } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { emailSchema } from '../../middleware/validate.js';

export const submitContactSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(2, 'Please enter your name')
    .max(100, 'Name must be 100 characters or fewer'),
  email: emailSchema,
  subject: z.string().trim().max(150).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Please write at least 10 characters')
    .max(2000, 'Please keep your message under 2000 characters'),
  /**
   * Honeypot. Real users never see this field, so anything in it is a bot.
   * The request is accepted with a normal-looking response so the bot does not
   * learn it was filtered.
   */
  website: z.string().max(255).optional(),
});

export type SubmitContactBody = z.infer<typeof submitContactSchema>;

const SPAM_WINDOW_HOURS = 1;
const SPAM_LIMIT = 3;

export async function submitContact(req: Request, res: Response) {
  const body = req.body as SubmitContactBody;

  if (body.website) {
    logger.warn({ ip: req.client.ip }, 'contact honeypot triggered');
    return sendCreated(res, { received: true, message: 'Thanks for reaching out. We will get back to you soon.' });
  }

  const since = new Date(Date.now() - SPAM_WINDOW_HOURS * 60 * 60_000);
  const [recent] = await db
    .select({ value: count() })
    .from(contacts)
    .where(and(eq(contacts.userIp, req.client.ip), gte(contacts.timeSent, since)));

  if ((recent?.value ?? 0) >= SPAM_LIMIT) {
    throw AppError.rateLimited('You have sent several messages recently. Please wait a little before sending another.');
  }

  await db.insert(contacts).values({
    fullname: body.fullname,
    email: body.email,
    subject: body.subject ?? null,
    message: body.message,
    userIp: req.client.ip,
    userAgent: req.client.userAgent,
    timeSent: new Date(),
    status: 'pending',
  });

  logger.info({ email: body.email, ip: req.client.ip }, 'contact message received');

  return sendCreated(res, {
    received: true,
    message: 'Thanks for reaching out. We will get back to you soon.',
  });
}
