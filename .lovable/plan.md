## లక్ష్యం

Design Studio ను Template-First approach తో simple చేయడం. 5 ready-made ID card designs (Front + Back) చూపించి, ఆర్గనైజేషన్ select చేసిన template కి colors, borders, line-wise text styling edit చేసుకునే option ఇవ్వడం. Save చేస్తే అదే template తో అన్ని members ID cards auto-generate అవుతాయి.

## 5 Ready-Made Templates

ప్రతి template కి Front + Back రెండూ pre-designed:

1. **Classic Rectangle** — సాంప్రదాయ rectangle, top header band, photo left, details right
2. **Modern Rounded** — rounded corners, gradient header, centered photo
3. **Vertical Portrait** — vertical layout, photo top, details bottom (lanyard friendly)
4. **Premium Gold** — dark background, gold accents, formal look
5. **Minimal Clean** — white minimal, thin borders, clean typography

ప్రతి template కి 2 modes: **Normal ID Card** (CR80 standard) మరియు **Keychain Type** (small, compact).

## Editable Properties (Selection తర్వాత)

### Global (whole card)
- Border color, border width, border style (solid/dashed/none)
- Background color / gradient
- Card corner radius

### Per-Element (logo, QR, name, slogan, reg#, member name, father name, village, pincode, phone, email, blood group, address, president signature)
- Show / Hide (delete-equivalent)
- Font family, font size, font weight, color
- Position adjust (optional - drag)
- Edit label text

### Auto-included Elements
- **Front**: Logo, Org Name, Slogan, Reg#, Member Photo, Member Name, Father Name, Member Code, Designation, QR Code
- **Back**: Village, Pincode, Phone, Email, Blood Group, Address, President Signature, Rules/Terms

## Workflow

```text
Step 1: Choose Card Type    [Normal] [Keychain]
Step 2: Choose Template     [1] [2] [3] [4] [5]   (Front+Back preview)
Step 3: Customize           Colors • Borders • Line-wise text edit
Step 4: Preview with sample member data
Step 5: Save as Org Default → applies to all members auto
```

## Data Model

Single JSONB column `id_card_design` on `organizations` table:

```json
{
  "cardType": "normal" | "keychain",
  "templateId": "classic" | "modern" | "vertical" | "premium" | "minimal",
  "global": {
    "borderColor": "#...", "borderWidth": 2, "borderStyle": "solid",
    "backgroundColor": "#...", "cornerRadius": 12
  },
  "elements": {
    "logo":        { "visible": true,  "size": 48 },
    "orgName":     { "visible": true,  "font": "Inter", "size": 18, "weight": 700, "color": "#..." },
    "slogan":      { "visible": true,  "font": "Inter", "size": 12, "weight": 400, "color": "#..." },
    "regNumber":   { "visible": true,  ... },
    "memberName":  { ... },
    "fatherName":  { ... },
    "village":     { ... },
    "pincode":     { ... },
    "phone":       { ... },
    "email":       { ... },
    "bloodGroup":  { ... },
    "address":     { ... },
    "qrCode":      { "visible": true, "size": 64 },
    "presidentSignature": { "visible": true, "imageUrl": null }
  }
}
```

Once saved, every member's ID card renders from this single design — no per-member customization needed.

## Files to Create/Change

**New files:**
- `src/lib/idCardTemplates.ts` — 5 template presets (default colors, layouts, font sizes)
- `src/lib/idCardDesign.functions.ts` — server fns: `getOrgIdDesign`, `saveOrgIdDesign`
- `src/components/IdCard/TemplatePicker.tsx` — Step 2 template gallery
- `src/components/IdCard/TemplateCustomizer.tsx` — Step 3 customization panel (colors + per-line text editor)
- `src/components/IdCard/IdCardRenderer.tsx` — single renderer that takes `(design, memberData)` → renders Front/Back. Used in both customizer preview and on member ID pages.

**Files to edit:**
- `src/routes/_authenticated/org.designs.tsx` — replace current complex builder with the 4-step Template-First flow
- `src/components/MemberIdCard.tsx` — use the new `IdCardRenderer` driven by saved org design

**Migration:**
- Add `id_card_design jsonb` column to `organizations` table (default = null → falls back to "classic" template)

**Files to remove from active flow (keep code for now, just hide):**
- `src/components/CustomIdBuilder.tsx` — moved to optional "Advanced" mode behind a small link

## Acceptance

- Org admin opens `/org/designs` → sees Normal/Keychain toggle + 5 template cards with Front+Back preview
- Selects one → customization panel opens with color pickers, border options, line-by-line text styling (size/font/color/show-hide)
- Sample member preview updates live
- Save → success toast, design persisted
- Any member's ID card page now renders with this design automatically — no member-side action needed
- Telugu labels throughout, mobile-friendly (361px viewport works)

## Out of Scope (this round)

- Drag-to-position elements (positions locked per template; only style/visibility editable)
- Per-member design overrides
- PDF export changes (existing PDF path keeps working with new renderer)
