---
name: timesheet
description: Fill Entity Solutions / People2.0 APAC weekly timesheets via Playwright. Use when the user asks to fill, submit, or update their timesheet on portal.entitysolutions.com.au.
---

# Entity Solutions Timesheet (Playwright)

Read [`timesheet-config.json`](../../timesheet-config.json) before filling. Edit `currentWeek.days` for the target week.

## Authentication (user only)

```bash
npm run auth
```

- Opens a headed browser to the portal login page.
- User completes login and Gmail 6-digit OTP manually.
- Click **Resume** in the Playwright inspector when logged in.
- Saves session to `auth-state.json` (gitignored). Re-run when session expires.

## Fill timesheet

```bash
npm run fill              # headless; prompts before submit if run in a terminal
npm run fill -- --headed  # watch the browser
npm run fill -- --period "15/06/2026 21/06/2026"  # override period
```

After save, the script asks **Submit timesheet for approval? (y/N)**. Default is no — press `y` only when you want to submit.

## Agent workflow

1. Update `currentWeek` in `timesheet-config.json`:
   - `periodMatch` — date substring for the week (e.g. `15/06/2026 21/06/2026`)
   - `days` — array of 7 entries (Mon–Sun): `{ hours, start?, end?, break?, note? }`
   - `hours: 0` zeros a day; partial days use e.g. `end: "14:30"` for 5h with `break: "00:30"`
2. Ensure auth: `npm run auth` if `auth-state.json` missing or fill reports session expired.
3. Run `npm run fill -- --headed` so the user can verify.
4. **Never submit for the user.** After save, the user must confirm at the terminal prompt or submit manually on the portal.

## Default full day

From config `defaults`: `09:00`–`17:00`, break `00:30`, 7.5 hours, rate Consulting Fee.

## Friday note (optional)

Add to Friday's day entry: `"note": "Thankyou, have a good weekend :)"`

## Troubleshooting

- Session expired → `npm run auth`
- Wrong week → fix `periodMatch` in config
- Hours wrong on grid → ensure `start`, `end`, `break` are set; script clicks description to trigger recalc
