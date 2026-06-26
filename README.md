# Entity Solutions Timesheet Automation

Playwright scripts for filling weekly timesheets on the [People2.0 / Entity Solutions APAC portal](https://portal.entitysolutions.com.au/webcenter/portal/login).

## Setup

```bash
npm install
npx playwright install chromium
```

## First-time auth

```bash
cp .env.example .env   # optional: auto-fill username/password
npm run auth
```

1. **Optional:** Add `TIMESHEET_USERNAME` and `TIMESHEET_PASSWORD` to `.env` (gitignored). `npm run auth` fills the login form; you only enter the Gmail OTP.
2. Complete Gmail OTP in the opened browser if prompted.
3. Session is saved to `auth-state.json` (gitignored). **`npm run fill` reuses this** — no login until the session expires.

Do **not** put credentials in `timesheet-config.json` (it may be committed).

## Fill this week

Edit [`timesheet-config.json`](timesheet-config.json) `currentWeek`, then:

```bash
npm run fill -- --headed
```

Review in the browser. When ready to submit, run fill again in your terminal and answer `y` at the prompt:

```bash
npm run fill -- --headed
# Submit timesheet for approval? (y/N): y
```

Or submit manually on the portal after save.

## Current week example (15/06/2026 – 21/06/2026)

| Day | Hours | Note |
|-----|-------|------|
| Mon | 5 | Some time taken off as child was in hospital |
| Tue | 5 | Same |
| Wed–Thu | 7.5 | Normal |
| Fri | 7.5 | Thankyou, have a good weekend :) |
| Sat/Sun | 0 | — |

## Files

- `timesheet-config.json` — portal settings + `currentWeek` day definitions
- `scripts/fill-timesheet.ts` — main fill script
- `scripts/auth.ts` — manual login + save session
- `.cursor/skills/timesheet/SKILL.md` — Cursor agent instructions
- `api-capture/portal-analysis.md` — ADF network analysis (reference)

## Security

Credentials live in local `.env` only. Gmail OTP is still manual when the portal asks for it.
