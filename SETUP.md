# Katcher H2H Golf — Setup Guide

Follow these steps exactly, in order. The whole process takes about 30 minutes.

---

## Step 1 — Install Node.js

1. Go to **https://nodejs.org**
2. Click the **LTS** (recommended) download button
3. Run the installer with all default options
4. Open a new terminal (Command Prompt or PowerShell) and verify:
   ```
   node --version
   npm --version
   ```
   Both should print version numbers (e.g., `v22.x.x` and `10.x.x`).

---

## Step 2 — Create a Supabase Project (free)

1. Go to **https://supabase.com** and sign up (free)
2. Click **New Project**
   - Organization: create one (e.g., "Katcher Family")
   - Name: `katcher-h2h`
   - Database password: choose something strong and save it
   - Region: pick the one closest to you (e.g., US East)
3. Wait ~2 minutes for the project to provision

---

## Step 3 — Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase/schema.sql` from this project folder
4. Copy ALL the contents and paste into the SQL Editor
5. Click **Run** (or Ctrl+Enter)
6. You should see "Success. No rows returned"

---

## Step 4 — Create Storage Buckets

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**, name it `photos`, check **Public bucket**, click Save
3. Click **New bucket** again, name it `avatars`, check **Public bucket**, click Save

Then set up storage policies for each bucket:

**For the `photos` bucket:**
1. Click the `photos` bucket → **Policies** tab
2. Click "New Policy" → "For full customization"
   - Policy name: `Public read`
   - Allowed operations: `SELECT`
   - Target roles: check both `anon` and `authenticated`
   - Policy definition: `true`
   - Save
3. Add another policy:
   - Policy name: `Auth upload`
   - Allowed operations: `INSERT`
   - Target roles: `authenticated`
   - Policy definition: `true`
   - Save
4. Add another policy:
   - Policy name: `Auth delete`
   - Allowed operations: `DELETE`
   - Target roles: `authenticated`
   - Policy definition: `true`
   - Save

**Repeat the same three policies for the `avatars` bucket.**

---

## Step 5 — Get Your API Keys

1. In Supabase, click **Project Settings** (gear icon) → **API**
2. Copy two values:
   - **Project URL** — looks like `https://abcxyz.supabase.co`
   - **anon / public key** — a long JWT string

---

## Step 6 — Configure the App

1. In the project folder (`Head_to_Head`), find the file `.env.example`
2. Create a copy named `.env` (remove the `.example` part)
3. Edit `.env` and fill in your values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 7 — Install Dependencies & Run Locally

Open a terminal, navigate to the project folder, and run:

```bash
cd "C:\Users\katch\OneDrive\Documents\Claude\Head_to_Head"
npm install
npm run dev
```

Your app will open at **http://localhost:5173** — you should see the golf site!

---

## Step 8 — Create Your First Admin User

1. Go to **https://supabase.com** → your project → **Authentication** → **Users**
2. Click **Invite user** (or **Add user**)
3. Enter your email address and a password
4. The user is created but is a "viewer" by default — upgrade to admin:
   - Go to **Table Editor** → `profiles` table
   - Find the row with your email
   - Click the row to edit it
   - Set `role` to `admin`
   - Set `full_name` to `Jason Katcher`
   - Set `nickname` to `Padre`
   - Set `display_preference` to `full_name` (or `nickname`)
   - Set `is_player` to `true`
   - Set `player_number` to `1`
   - Save

5. Do the same for Braeden's account:
   - Create a second user (Braeden's email)
   - Set role to `admin` (so he can also enter rounds and upload photos)
   - Set `full_name`, `nickname`, `is_player = true`, `player_number = 2`

---

## Step 9 — Add Courses

1. Sign in to your app at http://localhost:5173/login
2. Go to **Admin → Manage Courses**
3. Add all the courses you play at

---

## Step 10 — Deploy to Vercel (free, shareable URL)

1. Create a free account at **https://vercel.com**
2. Install Vercel CLI (optional) OR use the web interface:
   - Push your code to GitHub first (see below), then import in Vercel

**Push to GitHub:**
1. Create a free account at **https://github.com**
2. Create a new repository (private or public, your choice)
3. Push the project:
   ```bash
   git init
   git add .
   git commit -m "Initial Katcher H2H site"
   git remote add origin https://github.com/YOUR_USERNAME/katcher-h2h.git
   git push -u origin main
   ```

**Deploy on Vercel:**
1. Go to **vercel.com/new**
2. Import your GitHub repository
3. In the "Environment Variables" section, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click **Deploy**
5. Your site will be live at `https://katcher-h2h.vercel.app` (or similar)

**Share with family:** Send them the Vercel URL. Anyone can view without logging in. Only admins can log in to enter data.

---

## Optional: Custom Domain

- A `.com` domain costs ~$12/year from Google Domains, Namecheap, or similar
- After buying, add it in Vercel → your project → Settings → Domains
- Something like `katcherh2h.com` or `katchergolf.com`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid API key" error | Check your `.env` file — no spaces around `=` |
| Photos not uploading | Make sure the `photos` storage bucket has public policies set |
| Can't see admin menu | Make sure your profile has `role = admin` in the profiles table |
| Site shows blank page | Check browser console for errors; make sure `npm install` completed |

---

## File Structure Reference

```
Head_to_Head/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          ← Login page (featured photo bg)
│   │   ├── Home.jsx           ← Rivalry banner + last 5 rounds
│   │   ├── Stats.jsx          ← Full stats dashboard
│   │   ├── Photos.jsx         ← Photo library (public)
│   │   └── admin/
│   │       ├── AdminRounds.jsx   ← Enter / edit rounds
│   │       ├── AdminCourses.jsx  ← Manage course database
│   │       ├── AdminUsers.jsx    ← Manage user profiles
│   │       └── AdminPhotos.jsx   ← Upload / manage photos
│   ├── components/            ← Navbar, Footer, Layout, etc.
│   ├── context/AuthContext.jsx
│   └── lib/supabase.js
├── supabase/schema.sql        ← Run this in Supabase SQL Editor
├── .env                       ← YOUR keys go here (never commit this!)
└── SETUP.md                   ← This file
```
