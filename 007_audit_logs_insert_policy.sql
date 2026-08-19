-- ============================================================================
-- SODHARA INVESTMENTS — Phase 3 bugfix: audit_logs was missing an INSERT policy
-- The original Phase 2 policy only granted SELECT. Since RLS default-denies
-- anything not explicitly allowed, every audit_logs insert from the normal
-- (RLS-scoped, non-service-role) client — e.g. from the interest-crediting
-- API route — has been silently failing. supabase-js doesn't throw on DB
-- errors, and that insert's result was never checked, so this had zero
-- visible symptoms: interest crediting itself works, only the audit trail
-- was quietly empty.
-- ============================================================================

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert" on public.audit_logs
  for insert with check (
    public.is_platform_admin()
    or (public.is_company_staff() and company_id = public.current_company_id())
  );
