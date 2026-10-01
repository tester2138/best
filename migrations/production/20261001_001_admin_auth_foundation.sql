CREATE TABLE IF NOT EXISTS public."twoFactor" (
  id TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  secret TEXT NOT NULL,
  "backupCodes" TEXT NOT NULL,
  "userId" TEXT NOT NULL UNIQUE REFERENCES public."user"(id) ON DELETE CASCADE,
  verified BOOLEAN NOT NULL DEFAULT true,
  "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."rateLimit" (
  id TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.staff_access (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  scope_mode TEXT NOT NULL DEFAULT 'selected' CHECK (scope_mode IN ('all', 'selected')),
  created_by TEXT,
  updated_by TEXT,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_brand_scopes (
  user_id TEXT NOT NULL,
  brand_id UUID NOT NULL,
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst')),
  scope_mode TEXT NOT NULL CHECK (scope_mode IN ('all', 'selected')),
  scope_brand_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
