# MBR App — Org QR + Member Registration with Approval

## ఎంపికలు (Confirmed)

- **QR Regenerate:** Org admin కావాలంటే కొత్త QR generate చేయవచ్చు (పాత QR invalid అవుతుంది)
- **Members:** Unlimited (limit లేదు)
- **Approval Flow:** Member QR submit చేసిన తర్వాత **Org admin approve చేస్తేనే** account active

---

## Flow

### A. Org Registration

1. Org form fill → Submit
2. Backend: Org record create + **unique org_code** generate
3. org_code నుండి QR image generate
4. Org email కి QR + welcome mail
5. Success screen: QR preview + Download + "Regenerate QR" button

### B. Org Dashboard (login తర్వాత)

- Current QR view / download
- **Regenerate QR** button (confirm → కొత్త code, పాత code invalid)
- Pending member requests list → **Approve / Reject** buttons
- Approved members list

### C. Member Registration

1. **సభ్యుడు** mode select
2. **QR scan** (camera) లేదా code paste
3. Backend org_code validate → valid అయితే form continue
4. Name, email, phone, photo submit
5. Member record create with `status = 'pending'`
6. Screen: "మీ request Org admin కి పంపబడింది. Approve అయ్యాక login చేయవచ్చు."
7. Org admin approve చేస్తే → member కి confirmation mail + login enabled
8. Reject అయితే → rejection mail

---

## Technical Plan

### Lovable Cloud

Enable చేయాలి (database + auth + email).

### Database

```text
organizations
  id, name, email, phone, logo_url, slogan
  org_code (unique, regeneratable)
  admin_user_id (auth.users fk)
  created_at

members
  id, org_id (fk), user_id (auth.users fk)
  name, email, phone, photo_url
  status: 'pending' | 'approved' | 'rejected'
  created_at, reviewed_at
```

RLS: Org admin → own org + its members. Member → own record.

### Server Functions

- `registerOrganization` — create + QR + email
- `regenerateOrgQr` (admin only) — new code + email
- `validateOrgCode` — public, code → org_id
- `submitMemberRequest` — create pending member
- `reviewMember` (admin only) — approve/reject + email
- `listPendingMembers` (admin only)

### Packages

- `qrcode` — server-side QR generation
- `html5-qrcode` — client camera scan

### Email Templates (Lovable Emails)

- `org-welcome.tsx` — QR + welcome
- `org-qr-regenerated.tsx` — new QR
- `member-approved.tsx`
- `member-rejected.tsx`

### Pages

- `/` — LOGIN (existing, extend with QR field in Member mode)
- `/org/dashboard` — Org admin (QR + pending requests)
- `/member/pending` — Member waiting screen

---

## Phased Delivery

1. **Phase 1:** Lovable Cloud + email domain setup
2. **Phase 2:** DB tables + Org registration + QR + welcome email
3. **Phase 3:** Org dashboard (QR view, regenerate, member approval)
4. **Phase 4:** Member registration with QR scan + pending flow
5. **Phase 5:** Approval emails + polish

---

ఈ plan తో ముందుకు వెళ్ళమంటారా? 

Ok