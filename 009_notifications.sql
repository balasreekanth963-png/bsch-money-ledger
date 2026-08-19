-- ============================================================================
-- SODHARA INVESTMENTS — Notification architecture (prep only, per spec §36)
-- This does NOT send WhatsApp/SMS/email. It creates the data trail so that
-- integration can be plugged in later without touching any other code —
-- every event that should eventually trigger a message already writes a
-- row here with status PENDING; a future worker just needs to pick up
-- PENDING rows, send them, and flip status to SENT/FAILED.
-- ============================================================================

create table if not exists public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  investor_id         uuid references public.investors(id) on delete cascade,
  investment_id       uuid references public.investments(id) on delete cascade,
  interest_period_id  uuid references public.investment_interest_periods(id) on delete cascade,
  notification_type   text not null check (notification_type in (
                         'INTEREST_CREDITED', 'INTEREST_PENDING', 'MATURITY_REMINDER', 'WITHDRAWAL_STATUS'
                       )),
  channel             text not null default 'none' check (channel in ('whatsapp', 'sms', 'email', 'none')),
  status               text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  message              text not null,
  metadata             jsonb,
  created_at            timestamptz not null default now(),
  sent_at               timestamptz
);

comment on table public.notifications is
  'Data trail only — no actual sending happens yet. A future worker reads PENDING rows and dispatches via channel, then updates status/sent_at.';

create index if not exists idx_notifications_company on public.notifications(company_id);
create index if not exists idx_notifications_investor on public.notifications(investor_id);
create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_notifications_type on public.notifications(notification_type);

alter table public.notifications enable row level security;

drop policy if exists "notifications_admin_select" on public.notifications;
create policy "notifications_admin_select" on public.notifications
  for select using (
    public.is_platform_admin()
    or (public.is_company_staff() and company_id = public.current_company_id())
  );

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert" on public.notifications
  for insert with check (
    public.is_platform_admin()
    or (public.is_company_staff() and company_id = public.current_company_id())
  );

-- ----------------------------------------------------------------------------
-- Date-based reminders (no user action triggers these — they need to be
-- scanned for periodically; there's no cron in this project yet, so for
-- now an admin runs the scan manually from /dashboard/notifications, and
-- swapping in a real scheduler later is a one-line change: call these
-- same two functions from a cron job instead of a button).
-- ----------------------------------------------------------------------------

create or replace function public.generate_maturity_reminders(
  p_days_ahead int default 30
) returns int
language plpgsql
as $$
declare
  v_count int := 0;
  v_inv record;
begin
  for v_inv in
    select i.id, i.company_id, i.investor_id, i.investment_code, i.maturity_date, inv.full_name
    from public.investments i
    join public.investors inv on inv.id = i.investor_id
    where i.status = 'active'
      and i.maturity_date between current_date and (current_date + p_days_ahead)
      and not exists (
        select 1 from public.notifications n
        where n.investment_id = i.id
          and n.notification_type = 'MATURITY_REMINDER'
      )
  loop
    insert into public.notifications (company_id, investor_id, investment_id, notification_type, message, metadata)
    values (
      v_inv.company_id, v_inv.investor_id, v_inv.id, 'MATURITY_REMINDER',
      format('%s''s investment %s matures on %s.', v_inv.full_name, v_inv.investment_code, v_inv.maturity_date),
      jsonb_build_object('maturity_date', v_inv.maturity_date)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_maturity_reminders is
  'Logs (does not send) a reminder for each active investment maturing within N days that has not already been logged.';

create or replace function public.generate_interest_pending_reminders()
returns int
language plpgsql
as $$
declare
  v_count int := 0;
  v_period record;
begin
  for v_period in
    select p.id as period_id, p.period_end, p.remaining_interest,
           i.id as investment_id, i.company_id, i.investor_id, i.investment_code, inv.full_name
    from public.investment_interest_periods p
    join public.investments i on i.id = p.investment_id
    join public.investors inv on inv.id = i.investor_id
    where p.status in ('PENDING', 'PARTIALLY_CREDITED')
      and p.period_end < current_date
      and not exists (
        select 1 from public.notifications n
        where n.interest_period_id = p.id
          and n.notification_type = 'INTEREST_PENDING'
      )
  loop
    insert into public.notifications (
      company_id, investor_id, investment_id, interest_period_id, notification_type, message, metadata
    )
    values (
      v_period.company_id, v_period.investor_id, v_period.investment_id, v_period.period_id, 'INTEREST_PENDING',
      format('%s owes %s interest for the period ending %s on %s.',
        v_period.full_name, v_period.remaining_interest, v_period.period_end, v_period.investment_code),
      jsonb_build_object('period_end', v_period.period_end, 'remaining_interest', v_period.remaining_interest)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.generate_interest_pending_reminders is
  'Logs (does not send) a reminder for each overdue, not-fully-credited interest period that has not already been logged.';
