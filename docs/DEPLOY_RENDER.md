# Deploy ASTRA free on Render — step by step

This puts the full ASTRA app online at a public link such as `https://astra-earth-independent-care.onrender.com`, on Render's free plan. No credit card is needed for the free web service.

**What you get:** every screen and feature — logins, live updates, Scenario lab, My health, symptom reports, acknowledgements, the delayed Earth link, 3D Earth and body, research library.

**What is different from running it on your own computer**

| | |
|---|---|
| Shared mission | Everyone who opens the link sees the **same** fictional mission. If one person starts a scenario, everyone sees it. |
| Fresh start | Data resets whenever the service restarts or redeploys. All data is fictional, so nothing is lost. |
| Sleeping | On the free plan the service sleeps after about 15 minutes with no visitors. The next visit wakes it in about a minute. |
| Anyone can pick a role | The demo login lets any visitor choose any role, including administrator. That is acceptable only because every crew member and reading is fictional. Never add real health data. |

---

## Part 1 — Create the service (about 5 minutes)

1. Open **https://render.com** and click **Get Started** (or **Sign in**).
2. Choose **GitHub** and sign in with the GitHub account that owns the ASTRA repository (`asjadkashif2004`).
3. When Render asks for GitHub access, choose **Only select repositories**, pick **Astra---Earth-Independent-Care-Platform-Nasa-Space-App-Challenges**, and click **Install** / **Authorize**.
4. In the Render dashboard click **New +** (top right) → **Blueprint**.
5. Select the ASTRA repository and click **Connect**.
6. Render reads the `render.yaml` file in the repository and shows one service: **astra-earth-independent-care**, plan **Free**.
   - Give the Blueprint any name, for example `astra`.
   - Leave the branch as **main**.
7. Click **Deploy Blueprint** (or **Apply**).

> If Render asks for payment details, check that the plan shown is **Free**. The free web service itself does not need a card.

## Part 2 — Watch it build (about 3–10 minutes)

1. Open the **astra-earth-independent-care** service and the **Logs** tab.
2. You should see, in order:
   - `v24.21.0` — the build step printing the Node.js version.
   - `PUBLIC DEMO MODE for astra-earth-independent-care.onrender.com: …` — the safety notice.
   - `ASTRA Command — http://localhost:10000` — the server started. Render routes your public link to it.
3. When the top of the page shows **Live**, the app is online.

## Part 3 — Check it works (2 minutes)

1. Click the link under the service name (it ends in **.onrender.com**).
2. The landing page with the 3D Earth opens. Under the login button you should see **"Shared public demo: …"**.
3. Choose **Demo administrator · full simulation** and click **Enter simulation**.
4. Check that the clock at the top right keeps moving — that means live updates work.
5. Open **Scenario lab**, start a scenario, then open **My health** and pick that crew member: after a short while it should say **"Needs a check"**.

Paste the link into your Space Apps project page if you want judges to try it. Open it once a few minutes before judging so it is awake.

---

## Doing it by hand instead of the Blueprint

If you prefer the normal form: **New +** → **Web Service** → pick the ASTRA repository, then fill in:

| Field | Value |
|---|---|
| Name | `astra-earth-independent-care` (any name works) |
| Branch | `main` |
| Runtime / Language | **Node** |
| Build Command | `node --version` |
| Start Command | `node services/api/server.mjs` |
| Instance Type | **Free** |

Under **Environment Variables** add:

| Key | Value |
|---|---|
| `NODE_VERSION` | `24.21.0` |
| `HOST` | `0.0.0.0` |
| `ASTRA_PUBLIC_DEMO` | `true` |
| `ASTRA_SPEED` | `30` |

Then click **Create Web Service**. Do not add `PORT` — Render sets it automatically, and ASTRA reads it.

## Using your own domain later

Add the domain in Render (**Settings → Custom Domains**), then add an environment variable `ASTRA_PUBLIC_HOSTS` with every hostname the app should answer to, separated by commas, for example `astra-earth-independent-care.onrender.com,astra.example.org`. ASTRA rejects any other hostname on purpose.

## Troubleshooting

| What you see | What it means / what to do |
|---|---|
| Build log says the Node version is not available | In **Environment**, change `NODE_VERSION` to `24` and click **Manual Deploy → Deploy latest commit**. ASTRA needs Node.js 24.21 or newer in the 24 line. |
| Log says `ASTRA_PUBLIC_DEMO=true needs ASTRA_PUBLIC_HOSTS` | Render did not provide the hostname. Add `ASTRA_PUBLIC_HOSTS` = your `….onrender.com` hostname (without `https://`) and redeploy. |
| Page shows `HOST_REJECTED` | You opened the app through a hostname that is not listed. Use the `.onrender.com` link, or add your custom domain to `ASTRA_PUBLIC_HOSTS`. |
| Page loads slowly the first time | The free service was asleep. Wait about a minute. |
| "Local request limit exceeded" | One visitor sent more than 240 requests in a minute. Wait a minute and reload. |
| Data disappeared | The service restarted or redeployed, so the fictional mission started fresh. This is expected. |

## How the public demo stays safe

- Public mode is **off by default**. Running `npm start` on your own computer still only listens on `127.0.0.1` and refuses to start on a public address unless `ASTRA_PUBLIC_DEMO=true` is set on purpose.
- Even in public mode the server answers only to its own hostname (Render's `RENDER_EXTERNAL_HOSTNAME`, or `ASTRA_PUBLIC_HOSTS`), so DNS-rebinding protection stays on.
- Login cookies are `HttpOnly`, `SameSite=Strict` and, over HTTPS, `Secure`. Writes from other websites are still refused.
- Each visitor gets their own request budget, so one busy visitor cannot lock out the judges.
- All crew, telemetry and reports are fictional. ASTRA is a research prototype, not a medical device.
