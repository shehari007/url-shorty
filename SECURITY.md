# Security Policy

Shorty handles data that deserves care: short links point at destinations people trust,
and the database stores visitor IPs, user agents and the email addresses of people who
file abuse reports. Security reports are taken seriously.

## Supported versions

| Version | Supported |
| --- | :---: |
| 3.x | ✅ |
| 2.x | ❌ |
| 1.x and earlier | ❌ |

Only the latest 3.x release receives security fixes. If you are running 2.x, see the
[upgrade guide](server/README.md#upgrading-an-existing-v2-database).

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately through GitHub's
[Private Vulnerability Reporting](https://github.com/shehari007/url-shorty/security/advisories/new)
— that is the fastest route and it keeps the details out of public view until a fix ships.

If that form is unavailable to you, contact
[@shehari007](https://github.com/shehari007) directly and ask for a private channel.

### What to include

A report is much easier to act on when it has:

- the affected component — web app (`frontend/`), API (`server/`), or both
- the version or commit SHA you tested against
- steps to reproduce, ideally a minimal request or `curl` command
- what an attacker gains — data disclosure, privilege escalation, denial of service
- any suggested remediation, if you have one

### What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement | within 5 days |
| Initial assessment | within 14 days |
| Fix or mitigation plan | depends on severity, communicated in the assessment |

This is a project maintained by one person in their own time, so these are honest targets
rather than a contractual SLA. You will be told if something is going to take longer.

### Disclosure

Please give a reasonable window to ship a fix before publishing details. Reporters are
credited in the release notes and the security advisory unless you would rather stay
anonymous.

## Scope

In scope:

- the API and its admin control plane (`server/`)
- the web app and its BFF session routes (`frontend/`)
- the SSRF and abuse guards around link creation
- authentication, session handling and role enforcement
- SQL injection, XSS, CSRF, and access-control flaws

Out of scope:

- vulnerabilities in the hosted instance at `shorty.msyb.dev` that stem from its
  deployment configuration rather than this source code
- findings that require an already-compromised admin account or host
- missing hardening headers with no demonstrated impact
- automated scanner output with no working proof of concept
- denial of service through sheer request volume against the public demo

## For self-hosters

A few deployment details carry real security weight:

- **`ADMIN_JWT_SECRET`** must be a high-entropy value you generated yourself
  (`openssl rand -base64 48`). It has no default and the API refuses to start without one.
- **Never set `BLOCK_PRIVATE_HOSTS=false` or `ALLOW_HTTP_TARGETS=true` in production.**
  They exist for local development and disabling them turns the shortener into an open
  SSRF proxy against your internal network.
- **Keep `DB_SSL=true`** against any managed database.
- **Put the API behind a proxy you control** and set `TRUST_PROXY_HOPS` to match it.
- The `visitor_ip` column stores plaintext IP addresses. Treat the database as containing
  personal data, restrict access to it, and reflect that in your own privacy policy.
