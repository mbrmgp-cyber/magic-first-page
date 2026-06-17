
# కార్యవర్గం (Committee) Feature - Updated Plan

## ముఖ్య మార్పు
**సంఖ్య fixed కాదు** - ప్రతి సొసైటీ admin తన అవసరం ప్రకారం ఎంత మందినైనా (5, 11, 21, 31...) నియమించుకోవచ్చు. పదవి స్థానాలు కూడా flexible.

## 1. పదవులు (Roles) - తెలుగు

| పదవి | సంఖ్య | అధికారాలు (Auto Permissions) |
|---|---|---|
| అధ్యక్షుడు (president) | 1 | అన్నీ - members, rules, accounts, events, committee manage |
| ఉపాధ్యక్షుడు (vice_president) | admin నిర్ణయం | అధ్యక్షుని అన్ని (committee manage తప్ప) |
| గౌరవ సలహాదారు (advisor) | admin నిర్ణయం | అన్నీ view + chat |
| కోశాధికారి (treasurer) | admin నిర్ణయం | Accounts full edit, మిగతావి view |
| కార్యనిర్వాహకుడు (executive) | admin నిర్ణయం | Events, rules, members edit |
| కార్యకర్త (worker) | admin నిర్ణయం | Events participate, chat |

**Validation**: కేవలం **అధ్యక్షుడు** మాత్రమే ఒక్కరే ఉండాలి (DB constraint). మిగతా పదవులు ఎంతమందినైనా.

## 2. Database Schema

కొత్త enum `committee_role`: president, vice_president, advisor, treasurer, executive, worker.

కొత్త table **`committee_members`**:
- `org_id`, `member_id`, `role`, `position_number` (display order, unique per org)
- `term_start_date`, `term_end_date`
- `qualifications`, `responsibilities` (text)
- `is_active` (boolean)
- **Unique constraint**: `(org_id, role) WHERE role='president' AND is_active=true` → ఒక్క president మాత్రమే

కొత్త column `organizations.committee_term_years` (default 2, admin మార్చవచ్చు).

**Helper functions** (security definer):
- `get_committee_role(_user_id, _org_id)` → role enum
- `can_manage_committee(_org_id)` → admin OR president
- `can_edit_accounts(_org_id)` → admin, president, vice_president, treasurer
- `can_edit_events(_org_id)` / `can_edit_rules(_org_id)` → admin, president, vice_president, executive

`can_edit_org()` update - committee roles ఆధారంగా.

## 3. UI - కొత్త page `/org/committee`

### Layout:
- **Header banner** (tricolor) - "మా కార్యవర్గం" + లోగో + "మొత్తం X మంది"
- **Term info** - "ప్రస్తుత పదవీకాలం: YYYY - YYYY"
- **Hierarchy sections** (పదవి వారీగా group, ఎన్ని ఉంటే అన్ని cards):
  - 🎖️ అధ్యక్షుడు (పెద్ద center card)
  - 🥈 ఉపాధ్యక్షులు (grid)
  - 💡 సలహాదారులు (grid)
  - 💰 కోశాధికారులు (grid)
  - ⚙️ కార్యనిర్వాహకులు (grid)
  - 🤝 కార్యకర్తలు (grid)
- **Each card**: photo, పేరు, పదవి badge, term dates, click → modal తో qualifications/responsibilities

### Admin/President controls:
- "+ సభ్యునిని నియమించండి" button - approved members list నుండి select + role + term dates + qualifications + responsibilities
- Edit/Remove icons per card
- **Settings panel**: పదవీకాలం years (org-wide)

### Member view:
- Read-only, "మీరు: [పదవి]" highlight

## 4. Server Functions (`src/lib/committee.functions.ts`)
- `listCommittee(orgId?)` - group by role
- `appointCommitteeMember({memberId, role, positionNumber, termStartDate, termEndDate, qualifications, responsibilities})`
- `updateCommitteeMember(id, updates)`
- `removeCommitteeMember(id)` - soft delete
- `getMyCommitteeRole()` - current user
- `updateTermYears(years)` - admin only

## 5. Navigation
Dashboard లో కొత్త tile **"కార్యవర్గం"** → `/org/committee`.

## 6. Existing pages refine
- `org.rules.tsx`, `org.events.tsx`, `org.accounts.tsx` లో edit gate ను committee role helpers ఆధారంగా update.
- `org.members.tsx` లో committee badge చూపించడం (role తో).

## Out of scope (later)
- Auto term expiry notifications
- Election/voting
- Term history archive

---

**Approve చేస్తే** - migration + server functions + UI page parallel గా implement చేస్తాను.
