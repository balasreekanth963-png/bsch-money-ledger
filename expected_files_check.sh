#!/bin/bash
# Run this from inside your bsch-money-ledger project folder.
# Lists every file that SHOULD exist locally, based on what was uploaded
# to Claude — and flags any that are missing.

EXPECTED_FILES="app/api/interest-periods/[id]/credit/route.ts
app/api/investments/route.ts
app/api/investors/route.ts
app/api/money-given/route.ts
app/api/money-taken/route.ts
app/dashboard/interest/CreditInterestButton.tsx
app/dashboard/interest/page.tsx
app/dashboard/investments/new/NewInvestmentForm.tsx
app/dashboard/investments/new/page.tsx
app/dashboard/investments/page.tsx
app/dashboard/investors/new/AddInvestorForm.tsx
app/dashboard/investors/new/page.tsx
app/dashboard/investors/page.tsx
app/dashboard/layout.tsx
app/dashboard/money-given/new/page.tsx
app/dashboard/money-taken/new/page.tsx
app/dashboard/page.tsx
app/layout.tsx
app/login/page.tsx
app/page.tsx
components/BSCHFooter.tsx
components/BSCHLogo.tsx
components/BottomNav.tsx
components/DesktopNav.tsx
components/QuickActionButton.tsx
components/SignOutButton.tsx
components/SodharaBrand.tsx
components/SummaryCard.tsx
components/dashboard/AdminDashboardView.tsx
components/dashboard/InvestorDashboardView.tsx
components/dashboard/MoneyLedgerForm.tsx
lib/supabase/admin.ts
lib/supabase/client.ts
lib/supabase/middleware.ts
lib/supabase/server.ts
lib/utils/codes.ts
lib/utils/format.ts"

MISSING=0
while IFS= read -r f; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    MISSING=$((MISSING+1))
  fi
done <<< "$EXPECTED_FILES"

if [ "$MISSING" -eq 0 ]; then
  echo "All expected files are present."
else
  echo ""
  echo "$MISSING file(s) missing — paste this list back to Claude."
fi
