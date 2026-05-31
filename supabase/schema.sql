-- ============================================================
-- Katcher H2H Golf — Supabase Database Schema
-- Run this in the Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT        NOT NULL DEFAULT '',
  full_name           TEXT        NOT NULL DEFAULT '',
  nickname            TEXT        NOT NULL DEFAULT '',
  display_preference  TEXT        NOT NULL DEFAULT 'full_name'
                        CHECK (display_preference IN ('full_name', 'nickname', 'both')),
  profile_image_url   TEXT,
  role                TEXT        NOT NULL DEFAULT 'viewer'
                        CHECK (role IN ('admin', 'viewer')),
  is_player           BOOLEAN     NOT NULL DEFAULT FALSE,
  player_number       INTEGER     CHECK (player_number IN (1, 2)),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT        NOT NULL,
  location    TEXT        NOT NULL DEFAULT '',
  par_18      INTEGER,
  par_9       INTEGER,
  yardage_18  INTEGER,
  yardage_9   INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS rounds (
  id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  date                DATE        NOT NULL,
  course_id           UUID        REFERENCES courses(id) ON DELETE SET NULL,
  holes               INTEGER     NOT NULL CHECK (holes IN (9, 18)),
  player1_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  player1_score       INTEGER     NOT NULL CHECK (player1_score > 0),
  player2_score       INTEGER     NOT NULL CHECK (player2_score > 0),
  handicaps_used      BOOLEAN     NOT NULL DEFAULT FALSE,
  player1_handicap    INTEGER     NOT NULL DEFAULT 0,
  player2_handicap    INTEGER     NOT NULL DEFAULT 0,
  player1_net_score   INTEGER,
  player2_net_score   INTEGER,
  result              TEXT        NOT NULL
                        CHECK (result IN ('player1_win', 'player2_win', 'draw')),
  side_bet            TEXT        NOT NULL DEFAULT 'none'
                        CHECK (side_bet IN ('player1_win', 'player2_win', 'draw', 'none')),
  notes               TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  storage_path  TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  caption       TEXT        NOT NULL DEFAULT '',
  uploaded_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- All tables are publicly readable, writes require auth/admin
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos   ENABLE ROW LEVEL SECURITY;

-- Helper: check if caller is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Profiles ──
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- ── Courses ──
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (true);

CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (is_admin());

-- ── Rounds ──
CREATE POLICY "rounds_public_read" ON rounds
  FOR SELECT USING (true);

CREATE POLICY "rounds_admin_write" ON rounds
  FOR ALL USING (is_admin());

-- ── Photos ──
CREATE POLICY "photos_public_read" ON photos
  FOR SELECT USING (true);

CREATE POLICY "photos_auth_insert" ON photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "photos_admin_update_delete" ON photos
  FOR ALL USING (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- Run these separately in Supabase > Storage OR via SQL
-- ============================================================

-- After running this SQL, go to Supabase > Storage and create:
--   Bucket name: photos   (public: YES)
--   Bucket name: avatars  (public: YES)
--
-- Then add these storage policies in the Storage > Policies tab:
--   photos bucket  → SELECT: allow public (anon + authenticated)
--   photos bucket  → INSERT: allow authenticated
--   photos bucket  → DELETE: allow authenticated (admin)
--   avatars bucket → SELECT: allow public
--   avatars bucket → INSERT: allow authenticated (own folder)
--   avatars bucket → DELETE: allow authenticated

-- ============================================================
-- SAMPLE DATA (optional — uncomment to add test courses)
-- ============================================================

-- INSERT INTO courses (name, location, par_18, par_9, yardage_18, yardage_9) VALUES
--   ('Augusta National',   'Augusta, GA',          72, 36, 7475, 3737),
--   ('Pebble Beach',       'Pebble Beach, CA',     72, 36, 6828, 3414),
--   ('TPC Sawgrass',       'Ponte Vedra Beach, FL',72, 36, 7189, 3594);
