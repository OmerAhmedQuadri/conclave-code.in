# Future Engineers Conclave — Invitation System

An invitation-only registration system for the **Future Engineers Conclave**, presented by code.in.

**Flow:**

1. Admin sends an invite from `/admin` → email goes out with a unique link
2. Invitee opens link → fills registration form → receives a 6-digit OTP
3. Invitee verifies OTP → status moves to "pending review"
4. Admin approves from `/admin` → confirmation email goes out

## Stack

- Next.js 15 App Router + React 19
- TypeScript, Tailwind, shadcn/ui primitives
- MongoDB (driver: `mongodb`)
- Nodemailer (any SMTP provider)
- React Hook Form + Zod

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in MongoDB, SMTP, and admin creds
npm run dev
```

Visit:

- `/` — public landing (invite-only message)
- `/admin/login` — admin sign in
- `/admin` — invitee queue, send invites
- `/admin/admins` — manage admin accounts

## Environment variables

| Variable                                                    | Required | What it does                               |
| ----------------------------------------------------------- | -------- | ------------------------------------------ |
| `MONGODB_URI`                                               | yes      | MongoDB connection string                  |
| `MONGODB_DB`                                                | optional | DB name (default: `fe-conclave`)           |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`       | yes      | SMTP creds for Nodemailer                  |
| `MAIL_FROM`                                                 | optional | From address (defaults to `SMTP_USER`)     |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                            | yes      | Bootstrap admin credentials                |
| `ADMIN_SESSION_SECRET`                                      | yes      | ≥16-char secret for signed cookie sessions |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`                               | optional | Footer link                                |
| `NEXT_PUBLIC_EVENT_START_ISO` / `NEXT_PUBLIC_EVENT_END_ISO` | optional | Calendar links                             |

Generate `ADMIN_SESSION_SECRET` with:

```bash
openssl rand -base64 32
```

## Project structure

```
app/
  api/
    admin/
      login/route.ts       Admin sign in
      logout/route.ts      Admin sign out
      invite/route.ts      Send invitation email
      invitees/route.ts    List invitees (json)
      decide/route.ts      Approve / reject after OTP verify
      admins/route.ts      GET / POST / DELETE admins
    invite/[token]/route.ts  Public lookup of invite state
    register/route.ts      Submit registration → sends OTP
    verify-otp/route.ts    Verify the 6-digit code
    resend-otp/route.ts    Send a fresh code

  admin/
    login/page.tsx           Sign-in screen
    (authed)/
      layout.tsx             Auth-gated chrome
      page.tsx               Invitee dashboard
      admins/page.tsx        Manage admins

  register/[token]/
    page.tsx                 Server-rendered state machine
    not-found.tsx            Invalid invite

  page.tsx                   Public landing (invitation-only)
  layout.tsx                 Root layout
  globals.css

components/
  ui/                        shadcn primitives
  fe-logo.tsx                FE square mark
  codein-logo.tsx            code.in wordmark
  site-header.tsx            Hero header (FE + code.in)
  site-footer.tsx            Footer
  event-details.tsx          Event details card
  register-flow.tsx          Two-phase form (registration + OTP)
  admin-login-form.tsx
  admin-logout.tsx
  admin-dashboard.tsx        Invitee queue + send invite
  admins-manager.tsx         Admin add / remove

lib/
  db.ts                      Mongo client + collection helpers
  mailer.ts                  Nodemailer transport + 3 templates
  tokens.ts                  Invite token + OTP generators
  admin-auth.ts              Sessions, password hashing, verify
  validations.ts             Zod schemas
  content.ts                 ★ ALL EDITABLE COPY ★
  config.ts                  Public env-derived config

types/index.ts
```

## Editing copy

All visible strings live in `lib/content.ts`. Edit, save, redeploy.

## MongoDB collections

- `invitees` — `{ email, name, token, status, formData, otp, otpExpiresAt, ... }`
  - statuses: `invited → registered → otp_verified → approved | rejected`
  - indexes: unique on `email` and `token`
- `admins` — `{ email, passwordHash, createdAt, createdBy }`
  - indexes: unique on `email`
  - the bootstrap admin from env vars is **not** stored here

## Deploy

Push to GitHub and connect on **Vercel**. Set all env vars from `.env.example` in the project settings. MongoDB Atlas (free tier) works out of the box.

For Gmail SMTP in production, you must use an [App Password](https://myaccount.google.com/apppasswords) (regular Gmail passwords no longer work).
