# Woolgrower Carbon & Productivity Self-Assessment

A web app for your workshop. Growers fill in two questionnaires on their own
devices; you watch the results build on a live facilitator dashboard that
ranks each grower's eligibility and suitability.

- **Survey** — the growers' view (the home page).
- **Dashboard** — your view, at the same address with `#/dashboard` on the end.

It runs in two modes automatically:

- **Demo mode** (no setup) — fake growers, data stays in the browser. Great for
  trying it out and for rehearsing your facilitation.
- **Live mode** — once you add Supabase keys, real growers' answers save to the
  cloud and your dashboard updates in real time across every device.

---

## Try it on your own computer first (optional, ~3 min)

You don't have to do this, but it's the quickest way to see it working.

1. Install Node.js (the "LTS" version) from nodejs.org if you don't have it.
2. Open a terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
3. Open the address it prints (usually `http://localhost:5173`).
4. The survey is the home page. Add `#/dashboard` to the address to see the
   facilitator view (passcode: `woolshed` until you change it).

It starts in **demo mode** with six fake growers so the dashboard isn't empty.

To go live, see **DEPLOY.md**.

---

## Changing the questions

There are **two ways**, for two different jobs:

**1. Reword questions live, from the dashboard** (no code, no redeploy).
Open the dashboard, click **✎ Edit questions**, and edit the wording, helper
text, the read-first instructions box, and answer labels. Save, and the survey
updates. Crucially, the question's id and answer options stay fixed, so any
answers already collected stay matched to the same question even after you
reword it. Use this for tweaks and tidy-ups — including on the day.

**2. Add/remove questions or change logic** — edit `src/config/surveys.js`.
This one file holds every question and the eligibility rules. Its top explains
every question type and feature:

- **Instructions box** — add `instructions: '…'` to any question and growers
  must read and acknowledge it before the answer unlocks.
- **Must answer to continue** — questions are required by default; the Continue
  button stays locked until they answer. Set `required: false` to allow a skip.
- **Target sliders** — the `target` type asks for a current value and a target
  on a slider, and shows the live improvement (amount and %) as they slide
  (e.g. current vs target sale weight). The dashboard charts current-vs-target
  and the group's average lift.
- **Branching** — send an answer to a different question, a later section, or
  straight to the end.

After editing `surveys.js`, commit on GitHub and Netlify redeploys in ~1 minute.

## Branding

All company branding lives in `src/config/brand.js` — the Integrity Ag logo,
website, values, and the colour palette. If you have exact brand hex codes,
paste them into `palette` there and the whole app re-skins. The logo is loaded
from your website; if it's ever unreachable the company name shows instead.

---

## What's where

```
src/config/surveys.js   <- the only file you normally edit (questions + rules)
src/survey/             <- the growers' questionnaire flow
src/dashboard/          <- your live results dashboard
src/lib/                <- data layer (Supabase + demo fallback)
supabase/schema.sql     <- paste into Supabase to create the database
DEPLOY.md               <- step-by-step go-live guide
```
