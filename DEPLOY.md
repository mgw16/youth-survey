# Deploying — go-live runbook

This follows the same path as your other apps: **GitHub → Netlify**, with
**Supabase** as the database. Allow about 20–30 minutes the first time. Each
step says what success looks like so you know it worked before moving on.

There are three accounts involved, all free tier is plenty:
- **GitHub** (holds the code) — github.com
- **Supabase** (the database) — supabase.com
- **Netlify** (hosts the website) — netlify.com

---

## Step 1 — Put the code on GitHub

1. Go to github.com and create a **new repository** (the green "New" button).
   Name it e.g. `wool-carbon-survey`. Leave it Public or Private, your choice.
   Don't tick "Add a README" — this project already has one.
2. On the new repo page, choose **"uploading an existing file"**.
3. Drag the **contents** of this project folder into the upload box, then
   **Commit changes**.
   - Tip: don't upload the `node_modules` folder if it exists — it's large and
     not needed. Everything else can go up.

✅ **Success looks like:** your repo page lists `package.json`, `src`,
`supabase`, `index.html`, etc.

---

## Step 2 — Create the Supabase database

1. Go to supabase.com → **New project**. Give it a name and a database
   password (save the password somewhere). Pick the Sydney region. Wait ~1 min
   for it to finish setting up.
2. In the left menu open **SQL Editor → New query**.
3. Open `supabase/schema.sql` from this project, copy **all** of it, paste it
   into the query box, and click **Run**.

✅ **Success looks like:** "Success. No rows returned." And under **Table
Editor** you now see two tables: `growers` and `responses`.

4. Now grab your keys. Open **Project Settings (the gear) → API**. Copy these
   two values — you'll paste them into Netlify in Step 4:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

---

## Step 3 — Create the Netlify site

1. Go to netlify.com → **Add new site → Import an existing project**.
2. Choose **GitHub** and pick the `wool-carbon-survey` repo.
3. Netlify reads `netlify.toml` and fills the build settings in for you:
   - Build command: `npm run build`
   - Publish directory: `dist`
   Leave those as they are.
4. **Don't deploy yet** — first add the keys in Step 4. (If it deploys now
   that's fine, it'll just be in demo mode until you add the keys and redeploy.)

---

## Step 4 — Add your keys to Netlify

1. In your Netlify site: **Site configuration → Environment variables → Add a
   variable → Add a single variable**. Add these three:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from Step 2 |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key from Step 2 |
   | `VITE_DASHBOARD_PASSCODE` | a passcode only you know (e.g. `bramble2026`) |

2. Go to **Deploys → Trigger deploy → Deploy site** so it rebuilds with the
   keys.

✅ **Success looks like:** open your site (the `something.netlify.app` address).
The small label in the top-right reads **LIVE** (not DEMO MODE). If it still
says DEMO MODE, the two Supabase variables didn't take — recheck spelling and
redeploy.

---

## Step 5 — A quick end-to-end test

1. Open your site, complete the survey as a test grower.
2. Open the same site with `#/dashboard` on the end, enter your passcode.
3. Your test grower should appear in the ranking within a second or two.
4. In Supabase → Table Editor → `responses`, you'll see the rows too.
5. When you're happy, clear the test: in Supabase, open the `growers` table and
   delete your test row (deleting a grower also removes their answers).

✅ **Success looks like:** a grower you enter on one device shows up on the
dashboard on another device, live.

---

## On the day

- **Growers:** share the plain site address (a QR code on a slide works well).
  Each grower opens it, enters their name and lists their properties, then
  works through the two sections once for each property. When they finish,
  "start again" hands the device to the next person.
- **You:** open `your-site.netlify.app/#/dashboard` on the room screen, enter
  the passcode once, and leave it up. It updates itself as growers submit.
- Use the **Ranked growers** table to drive the conversation; tap any row to
  show the reasoning and that grower's full answers.

---

## Replacing the questions later

When your finalised/edited questions arrive:

1. Edit `src/config/surveys.js` (the file's top explains everything).
2. Commit the change on GitHub — either through GitHub's web editor (open the
   file → pencil icon → edit → Commit changes) or a local `git push`.
3. Netlify rebuilds automatically in ~1 minute. Hard-refresh the page
   (Ctrl+F5) to see it.

No database changes are needed unless you rename question ids.

---

## Locking down the dashboard (optional, stronger security)

The passcode is a light gate — it keeps casual eyes off the dashboard, but the
data is technically readable by anyone with the anon key (normal for this kind
of public client app). For a workshop this is fine. If you ever need it
tighter, two easy options:

- **Netlify password:** Site configuration → Access control → Visitor access →
  Password protect, and only share that password with yourself.
- **Restrict reads:** in `supabase/schema.sql`, remove the two "anyone can
  read" policies and move the dashboard's reads behind a Netlify Function using
  the Supabase *service* key. (Happy to set this up if you want it.)

---

## Troubleshooting

- **Top-right says DEMO MODE after deploy** → the Supabase env vars aren't set
  or were added after the last build. Recheck them and trigger a new deploy.
- **"Could not save that answer"** → usually the `schema.sql` wasn't run, or the
  RLS policies in it didn't apply. Re-run the schema file in Supabase.
- **Dashboard empty but growers submitted** → check you're on the same Supabase
  project, and that realtime is on (the schema file turns it on).
- **Build fails on Netlify** → open the deploy log; almost always a typo in
  `src/config/surveys.js`. The error names the file and line.
