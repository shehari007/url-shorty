/**
 * Creates (or promotes) an admin account.
 *
 *   npm run admin:create
 *   npm run admin:create -- --email you@example.com --name "Your Name" --role owner
 *
 * The password is read from stdin with echo disabled. Never pass it as an
 * argument, or it lands in your shell history and the process list.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { eq } from 'drizzle-orm';
import { closeDatabase, db } from '../src/db/index.js';
import { adminRoles, adminUsers, type AdminRole } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/crypto.js';

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

const CTRL_C = String.fromCharCode(3); // Ctrl-C
const CTRL_D = String.fromCharCode(4); // Ctrl-D (EOF)
const BACKSPACE = String.fromCharCode(127); // DEL

/** Prompt without echoing keystrokes, so the password never appears on screen. */
async function promptHidden(question: string): Promise<string> {
  stdout.write(question);

  return new Promise((resolve, reject) => {
    const wasRaw = stdin.isRaw ?? false;
    let value = '';

    const detach = () => {
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    const onData = (chunk: Buffer) => {
      const char = chunk.toString('utf8');

      if (char === '\n' || char === '\r' || char === CTRL_D) {
        detach();
        stdout.write('\n');
        resolve(value);
        return;
      }

      if (char === CTRL_C) {
        detach();
        stdout.write('\n');
        reject(new Error('Cancelled'));
        return;
      }

      if (char === BACKSPACE || char === '\b') {
        value = value.slice(0, -1);
        return;
      }

      // Ignore remaining control sequences (arrow keys, function keys...).
      if (char >= ' ') value += char;
    };

    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.on('data', onData);
  });
}

function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  let rlClosed = false;
  const closeRl = () => {
    if (!rlClosed) {
      rl.close();
      rlClosed = true;
    }
  };

  try {
    const email = (readFlag('email') ?? (await rl.question('Admin email: '))).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address');

    const name = (readFlag('name') ?? (await rl.question('Display name: '))).trim();
    if (name.length < 2) throw new Error('Name must be at least 2 characters');

    const roleInput =
      (readFlag('role') ?? (await rl.question('Role [owner|admin|moderator] (owner): '))).trim() || 'owner';
    if (!adminRoles.includes(roleInput as AdminRole)) {
      throw new Error(`Role must be one of: ${adminRoles.join(', ')}`);
    }
    const role = roleInput as AdminRole;

    // readline and the raw-mode prompt cannot both own stdin.
    closeRl();

    const password = await promptHidden('Password (hidden): ');
    const problem = validatePassword(password);
    if (problem) throw new Error(problem);

    const confirm = await promptHidden('Confirm password: ');
    if (password !== confirm) throw new Error('Passwords do not match');

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

    if (existing) {
      // Re-running with an existing email resets the password and unlocks the
      // account. This is the intended account-recovery path.
      await db
        .update(adminUsers)
        .set({
          name,
          role,
          passwordHash,
          isActive: 1,
          failedAttempts: 0,
          lockedUntil: null,
          tokenVersion: existing.tokenVersion + 1,
          updatedAt: now,
        })
        .where(eq(adminUsers.id, existing.id));

      console.log(`\n✅ Updated existing admin "${email}" (role: ${role}). All previous sessions were revoked.`);
    } else {
      await db.insert(adminUsers).values({
        email,
        name,
        passwordHash,
        role,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`\n✅ Created admin "${email}" (role: ${role}).`);
    }

    console.log('   Sign in at:  <your frontend origin>/admin/login\n');
  } finally {
    closeRl();
    await closeDatabase().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
