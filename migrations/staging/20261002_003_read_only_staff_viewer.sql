ALTER TABLE public.staff_access
  DROP CONSTRAINT IF EXISTS staff_access_role_check,
  ADD CONSTRAINT staff_access_role_check
    CHECK (role IN ('viewer', 'editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst'));

ALTER TABLE public.staff_invitations
  DROP CONSTRAINT IF EXISTS staff_invitations_role_check,
  ADD CONSTRAINT staff_invitations_role_check
    CHECK (role IN ('viewer', 'editor_publisher', 'commercial_manager', 'support_reviewer', 'analyst'));
