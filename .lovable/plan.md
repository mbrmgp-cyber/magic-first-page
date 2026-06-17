## Apply Saffron / Green (Indian tricolor) theme

### Scope
Visual-only update across the main user-facing pages — no logic, DB, or field changes.

### Files to change
1. **`src/styles.css`** — add tricolor gradient tokens:
   - `--gradient-tricolor`: saffron `#FF9933` → cream `#FFF7E6` → green `#138808`
   - `--saffron: #FF9933`, `--india-green: #138808`, `--cream: #FFF7E6`
   - `--shadow-warm`: soft saffron-tinted shadow

2. **`src/routes/auth.tsx`** — replace current background with the tricolor gradient; keep form card on translucent white (`bg-white/90 backdrop-blur`) for readability; primary button gets saffron→green gradient.

3. **`src/routes/org.register.tsx`** — same tricolor background + translucent card; submit button in saffron→green gradient; file pickers keep cream borders.

4. **`src/routes/member.register.tsx`** — same background treatment for consistency.

5. **`src/components/SplashScreen.tsx`** — keep black splash (per earlier requirement), but add a thin saffron→green underline accent below the "Management of Board Resources" text for brand continuity.

### Not changing
- Splash screen black background (your earlier requirement)
- Any form fields, validation, uploads, or i18n strings
- Dashboard / pending pages (can apply later if you like)