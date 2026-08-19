-- ============================================================================
-- SODHARA INVESTMENTS — Phase 3 bugfix: interest_pending was ₹0 until a
-- full period completed, disagreeing with the investor-side dashboard
-- (which correctly pro-rates accrual within the current period). This
-- re-issues company_dashboard_totals with the same accrued-minus-credited
-- definition used in investor_investment_summary.
--
-- Run this whole file — it's just the corrected `create or replace view`
-- from 006_dashboard_views.sql, safe to re-run.
-- ============================================================================

create or replace view public.company_dashboard_totals
with (security_invoker = true) as
select
  c.id as company_id,
  c.company_name,

  (select count(*) from public.investors inv2 where inv2.company_id = c.id) as total_investors,

  (select coalesce(sum(principal_amount), 0) from public.investments iv
    where iv.company_id = c.id and iv.status = 'active') as total_investments_received,

  (select coalesce(sum(amount), 0) from public.money_given mg
    where mg.company_id = c.id and mg.status = 'active') as total_money_given,

  (select coalesce(sum(amount), 0) from public.money_taken mt
    where mt.company_id = c.id and mt.status = 'active') as total_money_taken,

  (select coalesce(sum(public.calculate_investment_interest(iv.principal_amount, iv.interest_rate, iv.start_date, iv.maturity_date)), 0)
     from public.investments iv where iv.company_id = c.id and iv.status = 'active') as interest_payable,

  (select coalesce(sum(iip.credited_interest), 0)
     from public.investment_interest_periods iip
     join public.investments iv on iv.id = iip.investment_id
     where iv.company_id = c.id) as interest_credited,

  -- FIX: was filtering to only fully-completed periods (period_end <= today),
  -- which showed ₹0 until a full month/quarter/year had actually elapsed.
  -- Now matches investor_investment_summary: accrued-to-date (pro-rated
  -- within the current period) minus what's been credited.
  (select coalesce(sum(greatest(public.calculate_accrued_interest(iv.id) - public.calculate_interest_credited(iv.id), 0)), 0)
     from public.investments iv where iv.company_id = c.id and iv.status = 'active') as interest_pending,

  (select coalesce(sum(public.calculate_outstanding_principal(iv.id)), 0)
     from public.investments iv where iv.company_id = c.id and iv.status = 'active') as principal_outstanding,

  (select count(*) from public.investments iv
     where iv.company_id = c.id and iv.status = 'active'
       and iv.maturity_date between current_date and current_date + interval '30 days') as upcoming_maturities_30d,

  (select count(*) from public.withdrawal_requests wr
     where wr.company_id = c.id and wr.status in ('REQUESTED', 'UNDER_REVIEW')) as pending_withdrawal_requests,

  (select count(*) from public.investment_interest_periods iip
     join public.investments iv on iv.id = iip.investment_id
     where iv.company_id = c.id and iip.status = 'PENDING' and iip.period_end < current_date) as overdue_interest_periods,

  (select count(*) from public.investment_transactions it
     where it.company_id = c.id and it.transaction_date = current_date) as todays_transactions

from public.companies c;

comment on view public.company_dashboard_totals is
  'One row per company. interest_pending is accrued-to-date minus credited (pro-rated within the current period), matching investor_investment_summary.';
