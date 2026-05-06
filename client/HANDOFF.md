# Future Engineers Conclave — Developer Handoff

**Owner:** code.in
**Project:** Invitation-only registration system for the Future Engineers Conclave
**Repo path (current):** `fe-conclave-rsvp/`
**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · MongoDB · Nodemailer

---

## 1. What this app does

A gated registration funnel. Members of the public **cannot** sign up themselves. The flow is:

```
  Admin               Invitee                       Admin
   │                    │                            │
   ▼                    │                            │
1. Send invite ────────▶│                            │
   (email w/ link)      │                            │
                        ▼                            │
                  2. Open link, fill form            │
                        │                            │
                        ▼                            │
                  3. Receive 6-digit OTP             │
                        │                            │
                        ▼                            │
                  4. Verify OTP → "waitlisted"       │
                        │                            ▼
                        │                       5. Approve / reject
                        │                            │
                        ▼                            │
                  6. Receive confirmation email ◀────┘
                     (only on approve)
```

There is no self-serve registration anywhere. The public landing page (`/`) only tells visitors that the event is invitation-only and points them to WhatsApp.

---

## 2. Statuses

Every invitee record moves through these states (`InviteeDoc.status` in MongoDB):

| Status         | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `invited`      | Admin sent the invite email; invitee hasn't opened the link yet        |
| `registered`   | Invitee submitted the form; OTP was emailed; awaiting OTP entry        |
| `otp_verified` | OTP verified — invitee is now on the **waitlist** awaiting admin review |
| `approved`     | Admin approved → confirmation email sent → seat confirmed              |
| `rejected`     | Admin rejected → no email sent                                         |

Approval is **manual**. The admin team uses `/admin` to review and approve.

---

## 3. Routes

### Public

| Route                  | Method | Purpose                                                 |
| ---------------------- | ------ | ------------------------------------------------------- |
| `/`                    | GET    | "Invitation-only" landing page                          |
| `/register/[token]`    | GET    | Token-gated registration page (renders one of: form, OTP step, waitlist screen, confirmation screen, "invalid" screen — based on the invitee's current status) |

### Admin (cookie-session gated)

| Route                | Method | Purpose                              |
| -------------------- | ------ | ------------------------------------ |
| `/admin/login`       | GET    | Sign-in form                         |
| `/admin`             | GET    | Invitee dashboard (queue + send invite) |
| `/admin/admins`      | GET    | Manage admin accounts                |

### API

| Route                       | Method | Auth   | Purpose                                       |
| --------------------------- | ------ | ------ | --------------------------------------------- |
| `/api/admin/login`          | POST   | —      | `{ email, password }` → sets session cookie   |
| `/api/admin/logout`         | POST   | —      | Clears session cookie                         |
| `/api/admin/invite`         | POST   | admin  | `{ email, name? }` → creates invite, sends email |
| `/api/admin/invitees`       | GET    | admin  | List all invitees                             |
| `/api/admin/decide`         | POST   | admin  | `{ token, decision: "approve" \| "reject" }` |
| `/api/admin/admins`         | GET    | admin  | List admin accounts                           |
| `/api/admin/admins`         | POST   | admin  | `{ email, password }` → add admin             |
| `/api/admin/admins?email=…` | DELETE | admin  | Remove admin                                  |
| `/api/invite/[token]`       | GET    | public | Public lookup of invite state (for SSR)       |
| `/api/register`             | POST   | token  | `{ token, data: registrationFields }` → sends OTP |
| `/api/verify-otp`           | POST   | token  | `{ token, otp }` → marks `otp_verified`       |
| `/api/resend-otp`           | POST   | token  | `{ token }` → emails a fresh OTP              |

"`token` auth" means the request must reference a valid invite token in the body; no cookie required.

---

## 4. MongoDB schema

Database name: from env `MONGODB_DB` (default `fe-conclave`).

### Collection: `invitees`

```ts
{
  _id: ObjectId,
  email: string,                  // lowercased, unique
  name?: string,
  token: string,                  // 24-byte base64url, unique
  status: "invited" | "registered" | "otp_verified" | "approved" | "rejected",

  // OTP fields (cleared on verification)
  otp?: string,                   // 6 digits
  otpExpiresAt?: Date,            // now + 10 min
  otpAttempts?: number,           // capped at 5

  // Registration form payload
  formData?: {
    parentName: string,
    parentPhone: string,
    studentName: string,
    studentAge: string,
    school: string,
    city: string,
    referral: string,
    question?: string,
  },

  invitedBy?: string,             // admin email
  invitedAt: Date,
  registeredAt?: Date,
  verifiedAt?: Date,
  decidedAt?: Date,
  decidedBy?: string,
}
```

Indexes (created automatically on first read): `{ token: 1 }` unique, `{ email: 1 }` unique.

### Collection: `admins`

```ts
{
  _id: ObjectId,
  email: string,                  // lowercased, unique
  passwordHash: string,           // "scrypt$<salt>$<derived>" — see lib/admin-auth.ts
  createdAt: Date,
  createdBy?: string,             // admin email who added this one
}
```

Indexes: `{ email: 1 }` unique.

> The **bootstrap admin** (`ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars) is **NOT** stored in this collection. It's a fallback that always works — useful for first sign-in and for recovery if all DB admins are removed.

---

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                  | Required | Description                                                         |
| ------------------------- | -------- | ------------------------------------------------------------------- |
| `MONGODB_URI`             | yes      | MongoDB connection string. Atlas: `mongodb+srv://user:pass@…`       |
| `MONGODB_DB`              | no       | DB name. Default `fe-conclave`                                      |
| `SMTP_HOST`               | yes      | SMTP server (Gmail: `smtp.gmail.com`, SES: `email-smtp.<region>.amazonaws.com`) |
| `SMTP_PORT`               | yes      | Usually `587` (STARTTLS) or `465` (TLS)                             |
| `SMTP_USER`               | yes      | SMTP username                                                       |
| `SMTP_PASS`               | yes      | SMTP password / app password                                        |
| `MAIL_FROM`               | no       | From address. Default: `SMTP_USER`. Recommended: `"Future Engineers Conclave <noreply@yourdomain.com>"` |
| `ADMIN_EMAIL`             | yes      | Bootstrap admin email                                               |
| `ADMIN_PASSWORD`          | yes      | Bootstrap admin password (≥8 chars, strong)                         |
| `ADMIN_SESSION_SECRET`    | yes      | ≥16 char random secret. Generate: `openssl rand -base64 32`         |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no  | Footer WhatsApp link                                                |
| `NEXT_PUBLIC_EVENT_START_ISO` | no  | ISO timestamp; used in calendar links                               |
| `NEXT_PUBLIC_EVENT_END_ISO`   | no  | ISO timestamp; used in calendar links                               |

### Gmail SMTP setup

Regular passwords no longer work. You need an [App Password](https://myaccount.google.com/apppasswords):
1. Enable 2-Step Verification on the Google account
2. Generate a 16-char app password
3. Use that as `SMTP_PASS`

### Production email recommendation

For production volume, **don't use Gmail** — you'll hit limits and deliverability issues. Use one of:
- **Mailgun** / **SendGrid** / **Postmark** (transactional email, ~free tier covers a few thousand sends/month)
- **AWS SES** (cheapest at scale; needs domain verification)
- **Resend** (developer-friendly; requires domain verification)

All of them expose generic SMTP creds, so no code changes needed — just swap the env vars.

---

## 6. Local setup

```bash
git clone <repo>
cd fe-conclave-rsvp
npm install
cp .env.example .env.local        # then edit with real values
npm run dev                       # http://localhost:3000
```

For local MongoDB:
```bash
brew install mongodb-community    # macOS
brew services start mongodb-community
# MONGODB_URI=mongodb://localhost:27017
```

Or use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier (M0). Whitelist `0.0.0.0/0` for development; restrict in production.

### First admin sign-in

1. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` in `.env.local`
2. Restart dev server
3. Visit `/admin/login`, sign in with those credentials
4. (Optional) From `/admin/admins`, add additional admin accounts

### Smoke test

1. `/admin` → "Send new invitation" → enter `you@yourself.com`
2. Check your inbox for the invite email
3. Click the link → fill the form → submit
4. Check inbox for the OTP email → enter the 6-digit code
5. Status should now read "Pending review" in `/admin`
6. Click **Approve** in the admin dashboard
7. Check inbox for the confirmation email

---

## 7. File map

```
app/
  api/
    admin/
      login/route.ts            POST /api/admin/login
      logout/route.ts           POST /api/admin/logout
      invite/route.ts           POST /api/admin/invite
      invitees/route.ts         GET  /api/admin/invitees
      decide/route.ts           POST /api/admin/decide
      admins/route.ts           GET / POST / DELETE /api/admin/admins
    invite/[token]/route.ts     GET  /api/invite/[token]
    register/route.ts           POST /api/register
    verify-otp/route.ts         POST /api/verify-otp
    resend-otp/route.ts         POST /api/resend-otp

  admin/
    login/page.tsx              Sign-in (public)
    (authed)/                   Route group requiring auth
      layout.tsx                Auth check + admin chrome (header, nav)
      page.tsx                  Invitee dashboard
      admins/page.tsx           Admin management

  register/[token]/
    page.tsx                    Server component — switches UI based on invitee status
    not-found.tsx               Invalid / unknown token

  page.tsx                      Public "invitation-only" landing
  layout.tsx                    Root layout, fonts, metadata
  globals.css                   Tailwind base + brand defaults

components/
  ui/                           shadcn primitives (button, input, label, select, textarea)
  fe-logo.tsx                   FE square mark (existing)
  codein-logo.tsx               code.in wordmark (NEW — inline SVG, brand gold)
  site-header.tsx               Hero header — FE logo + divider + code.in wordmark
  site-footer.tsx               Footer (uses CodeInLogo)
  event-details.tsx             Event details card
  register-flow.tsx             Two-phase client component: form → OTP
  admin-login-form.tsx          Login form
  admin-logout.tsx              Logout button
  admin-dashboard.tsx           Invitee table + send-invite form
  admins-manager.tsx            Add / remove admins UI

lib/
  db.ts                         MongoDB client (lazy init) + collection helpers
  mailer.ts                     Nodemailer transporter + 3 email templates
  tokens.ts                     generateInviteToken, generateOtp, OTP_TTL_MS
  admin-auth.ts                 Sessions (HMAC-signed cookie), scrypt password hashing
  validations.ts                Zod schemas (registration, invite, OTP, admin decision)
  content.ts                    ★ ALL EDITABLE COPY ★
  config.ts                     Public env-derived config (WhatsApp, event ISO)
  utils.ts                      cn() class merger

types/
  index.ts                      Shared API types
```

---

## 8. Editing copy

**All visible strings are in `lib/content.ts`.** The hero copy, form labels, OTP screen text, waitlist screen text, confirmation screen text, footer text — all there. Edit, save, redeploy.

The three email templates (invite / OTP / confirmation) are inline in `lib/mailer.ts`. They're plain HTML strings styled inline (required for email clients). Edit them there.

---

## 9. Auth model

### Admin sessions

- Login at `/admin/login` with email + password
- On success, the server sets an `fec_admin` httpOnly cookie containing `<email>.<expires>.<HMAC-SHA256(secret, "<email>.<expires>")>`
- Cookie expires after 12 hours
- Verified server-side by recomputing the HMAC and checking expiry
- No JWT library — uses Node's built-in `crypto`

### Password hashing

- Uses Node's `scrypt` (no bcrypt dep)
- Format: `scrypt$<base64-salt>$<base64-hash>`
- Salt is 16 random bytes; derived key is 64 bytes
- See `hashPassword` / `verifyHash` in `lib/admin-auth.ts`

### Bootstrap admin

The env-based admin (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) is **always valid** regardless of the `admins` collection. This is intentional:
- First sign-in works before any DB row exists
- Recovery path if all DB admins are deleted

If you want to disable the bootstrap admin in production, unset `ADMIN_EMAIL`/`ADMIN_PASSWORD` after creating at least one DB admin.

### Token security (invites)

- Invite tokens are 24 random bytes (`crypto.randomBytes`) → 32-char base64url
- ~192 bits of entropy — not enumerable
- Tokens never expire by themselves; status transitions gate behavior
  - Once `approved` or `rejected`, the registration page shows a "closed" state and won't accept new submissions

### OTP security

- 6 digits, generated with `crypto.randomInt`
- 10-minute TTL (`OTP_TTL_MS` in `lib/tokens.ts`)
- Max 5 attempts per OTP (`OTP_MAX_ATTEMPTS`)
- After max attempts, user must request a new code via "Resend"
- OTP is cleared from the DB the moment it's verified

---

## 10. Deployment

### Recommended: Vercel

1. Push the repo to GitHub
2. Import in Vercel
3. Set all env vars from `.env.example` in **Project Settings → Environment Variables**
4. Deploy

That's it — no other config required.

### Other Node hosts

```bash
npm run build
npm run start
```

Requires Node 20+. Make sure all env vars are set in the hosting environment.

### MongoDB Atlas

For production:
- Create an M10+ cluster (M0 free tier is fine for dev/staging only)
- IP allowlist: add your Vercel/host egress IPs (or `0.0.0.0/0` if you trust the password — Atlas connections are TLS by default)
- Use a dedicated DB user with read/write access only to the project DB (not admin)

### Domain & email deliverability

- Buy/use a custom domain. Set `MAIL_FROM` to `events@yourdomain.com`
- Configure SPF, DKIM, and DMARC for that domain on whichever email provider you choose. Without these, emails will land in spam.
- Test with [mail-tester.com](https://www.mail-tester.com/) — aim for 9+/10 before going live

---

## 11. Hardening checklist before production

These are **not done yet** — recommended before public launch:

- [ ] **Rate-limit `/api/register`, `/api/verify-otp`, `/api/resend-otp`, `/api/admin/login`.** Currently no rate-limiting. Use Vercel Edge Middleware + Upstash Redis, or Next.js middleware with an in-memory bucket. Suggested: 10 req/min per IP on each.
- [ ] **Lock down CORS.** Currently routes accept any origin. Add an origin check to mutation routes if hosting under a known domain.
- [ ] **Email throttling.** A malicious actor with a leaked invite link can spam OTP requests. Cap to 3 OTPs / 30 min per token.
- [ ] **CAPTCHA on the registration form.** Optional; consider if invites leak.
- [ ] **Logging.** Wire `console.error` calls to a real log sink (Sentry, Logtail, Vercel Log Drain). Errors currently go to stdout only.
- [ ] **Audit log.** Currently `decidedBy` and `invitedBy` are stored, but not surfaced anywhere. Build a small audit log view if compliance matters.
- [ ] **Domain verification for SMTP** (SPF/DKIM/DMARC) — see deployment section.
- [ ] **Backup the MongoDB collection** before the event. Atlas does this automatically on M10+.
- [ ] **Set `robots.noindex`** in `app/layout.tsx` is already done — keep it that way until launch.
- [ ] **Replace bootstrap admin** in production with a proper DB admin, then remove `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars.
- [ ] **Restrict `0.0.0.0/0` MongoDB IP allow** to known egress IPs.

---

## 12. Known issues & notes

- **No password reset for DB admins.** If a DB admin forgets their password, another admin (or the bootstrap admin) must remove and re-add them. There's no "forgot password" flow yet — by design (small admin pool).
- **No email change for invitees.** Invites are tied to the email the admin enters. If the recipient has a different preferred address, the admin must reject the invite (or the invitee can be removed from MongoDB) and a new one sent.
- **Invitee deletion not exposed in UI.** Manual MongoDB delete only. Add a "delete" button to `admin-dashboard.tsx` if needed.
- **OTP resend resets the attempt counter.** A persistent attacker can keep requesting fresh codes; rate-limiting (see hardening) closes this.
- **Admin role is binary.** Every admin can do everything. No "viewer-only" role yet. Easy to add a `role` field to `AdminDoc` if needed.
- **The code.in logo (`components/codein-logo.tsx`) is an inline SVG approximation.** If marketing has the official asset file (preferred), drop the SVG/PNG into `/public/codein.svg` and replace the component with `<Image src="/codein.svg" … />`.

---

## 13. Quick reference: how to do common things

**Send an invite from a script (instead of UI):**
```bash
curl -X POST http://localhost:3000/api/admin/invite \
  -H "Cookie: fec_admin=<your session cookie>" \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","name":"Asha"}'
```

**Bulk invite from a CSV:** there's no built-in import; loop over rows in a Node script and call `/api/admin/invite` for each. Easy to add if needed.

**Manually mark someone approved:** in `mongosh`:
```js
db.invitees.updateOne(
  { email: "parent@example.com" },
  { $set: { status: "approved", decidedAt: new Date(), decidedBy: "manual" } }
)
```
(This skips the OTP step — but no confirmation email will be sent. Use the UI if you want the email.)

**Reset OTP attempts:** in `mongosh`:
```js
db.invitees.updateOne({ email: "x" }, { $set: { otpAttempts: 0 } })
```

**Reset all data (dev only):**
```js
db.invitees.deleteMany({})
db.admins.deleteMany({})
```

---

## 14. Contact

Project owner: **code.in / Sami** — WhatsApp +91 99596 82957

Anything that's unclear in this doc, ask before guessing — happy to clarify.
