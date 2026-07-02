
# Chit Fund Core Rewrite Plan

Scope: rewrite the Chit Auction module (`org.auction.tsx`, `auction.functions.ts`, DB schema, RPCs) so every rule below is dynamic, Supabase-backed, and shared live between Admin and Member dashboards.

---

## 1. Database (single migration)

Extend `auction_sessions` and add supporting tables:

- `auction_sessions` — add columns:
  - `foreman_mode` text — `'commission'` | `'free_month'`
  - `foreman_free_month` int — nullable, used when mode = `free_month`
  - `terms` text — group terms & conditions
  - `close_at` timestamptz — auction close time (drives 5-min warning)
  - `total_members` int — derived at save time (participants + foreman if included)
  - `foreman_included` boolean — company/owner counted as a member
- New table `auction_payments` — receipt uploads per member per month
  - `auction_id`, `org_id`, `member_id`, `month_no`, `amount`, `receipt_url`, `status` (`pending`|`verified`|`rejected`), `note`, `uploaded_by`, timestamps
  - RLS: member can insert/select own rows; org admin/committee can select/update all.
  - GRANTs to authenticated + service_role.
- Storage bucket `chit-receipts` (private) with RLS policies for uploads/reads.
- RPC `finalize_chit_auction(_org_id, _auction_id)` — picks highest bid, writes winner fields, sets `auction_closed=true`, appends to `past_winners`.
- RPC `reset_chit_month(_org_id, _auction_id)` — advances `current_month`, clears bids for next round (keeps history in `past_winners`).
- Keep existing `submit_chit_bid` / `submit_chit_consent`.

## 2. Server functions (`src/lib/auction.functions.ts`)

Extend `AuctionStateDTO` with `foremanMode`, `foremanFreeMonth`, `foremanIncluded`, `terms`, `closeAt`, `totalMembers`. New server fns:

- `saveGroupConfig` — upsert config (name, chit value, months, start date, close time, foreman rules, terms, participants). Never touches `bids`.
- `deleteGroup` — delete an `auction_sessions` row by id (admin only).
- `finalizeAuction` — calls `finalize_chit_auction` RPC.
- `resetToNextMonth` — calls `reset_chit_month` RPC.
- `uploadPaymentReceipt` — inserts into `auction_payments` (file already in storage).
- `verifyPayment` — admin updates status.
- `listPayments` — admin/member scoped view.

## 3. Admin UI (`org.auction.tsx` admin view)

Rebuild into 4 sections:

1. **Group Manager** — card list of all groups (from `groups[]`). Buttons: `Create New Group`, `Edit`, `Delete`. Create/Edit dialog fields:
   - Group Name, Total Chit Amount, Total Months (free input), Start Date, Close Time (per-round), Terms textarea
   - Foreman toggle: "Include Company as Member"
   - Foreman Benefit radio: `Percentage Commission` (%) OR `Free Month` (month number)
   - Add-member row: search/pick member by ID → append to participants list
2. **Live Auction Board** (after selecting a group card):
   - Header: Group name, Current Month, Chit Value, Start Time, Close Time countdown
   - Member rows with live bid capsule + progress bar (bid / chit value)
   - Live Metrics panel using the exact formulas below
   - Buttons: `Start Turn`, `Close / Finalize Winner`, `Reset / Next Month`
3. **Payments Panel** — table of receipts for current month, verify/reject actions, image preview.
4. **PDF Print** (footer button) — see §6.

## 4. Member UI

- Group cards visible (A, B, C). Selecting one shows: Current Month, Chit Value, Start/Close time, live metrics, sequential bid table, own bid input + submit, `Approve Winner` consent button when auction closed.
- Payment upload widget: file picker → `chit-receipts` bucket → `auction_payments` row.
- 5-minute toast warning driven by `close_at` timer in a `useEffect` interval.

## 5. Calculation module (`src/lib/chit-math.ts`)

Pure functions (no hardcoded values):
```
topBid                 = max(bids.amount)
interestPct            = (topBid / chitValue) * 100
dividendPool           = topBid
dividendPerMember      = dividendPool / totalMembers
netPayPerMember        = (chitValue / totalMembers) - dividendPerMember
foremanCommissionAmt   = mode === 'commission' ? chitValue * commissionPct/100 : 0
```
Called from both admin & member views so numbers always match.

## 6. PDF Report

Client-side `window.print()` with a hidden print template rendering:
- Org logo + name (from `organizations` row)
- Group config block (chit value, months, start date, foreman rule, terms)
- Sequential bid history table for current month
- Past winners table (from `past_winners`)
- Payments status table (from `auction_payments`)
- Two signature lines: "CHS Accountant" / "Society President"

## 7. Realtime

Already subscribed to `auction_sessions` and `bids`. Add subscription to `auction_payments` filtered by `org_id` so payment verifications reflect instantly on member view.

---

## Technical notes

- Group cards are the `groups[]` array already returned by `getAuctionState`; no schema change needed for listing.
- `Start Turn` / `Close` / `Reset` are surgical UPDATE RPCs — they never write `participants`, preventing the member-wipe bug.
- All formula values recomputed in a `useMemo` from `bids + config`; no stored `interest_rate`.
- Foreman "free month" logic: on that month number, `Close / Finalize` auto-assigns winner = foreman with amount 0, skipping bidding.
- File uploads go to private `chit-receipts` bucket; signed URLs generated on read.

---

## Deliverables (in order)

1. Supabase migration — schema, RLS, GRANTs, RPCs, bucket.
2. `src/lib/chit-math.ts` — pure calc module.
3. `src/lib/auction.functions.ts` — new/updated server fns.
4. `src/routes/_authenticated/org.auction.tsx` — admin + member rewrite.
5. `src/components/ChitPrintSheet.tsx` — printable PDF layout.
6. Verify via Playwright: create group → add members → place bids → live metrics update → 5-min toast → close → consent → payment upload → PDF print.

Approve to proceed and I will execute in this order.
