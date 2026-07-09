// AutoTransliterate — dictionary-based Telugu → English translator.
//
// When the UI language is English, walks the DOM and replaces text nodes whose
// trimmed content matches a known Telugu phrase with its proper English
// translation. This is intentionally exact-match only; text nodes containing
// Telugu that isn't in the dictionary are left as-is (never transliterated),
// so there is no unreadable pseudo-English ("Tenglish") output.
//
// Fine-grained bilingual pages should still use the `lt(en, te)` helper for
// perfect control. This component is the safety net for pages that still have
// hardcoded Telugu strings.
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

// Telugu → English phrase dictionary. Order does not matter; matching is done
// on the *trimmed* text content of individual DOM text nodes.
const TE_EN: Record<string, string> = {
  // Common navigation
  "డాష్‌బోర్డ్": "Dashboard",
  "డాష్ బోర్డ్": "Dashboard",
  "ఖాతాల కేంద్రం": "Accounts Hub",
  "మాస్టర్ లెడ్జర్": "Master Ledger",
  "మాస్టర్ లెడ్జర్ చూడండి →": "View Master Ledger →",
  "మాస్టర్ లెడ్జర్ చూడండి": "View Master Ledger",

  // Events / Meetings hub
  "కార్యక్రమాలు, సమావేశాలు, నిర్ణయాలు": "Events, Meetings & Decisions",
  "సమావేశాలు": "Meetings",
  "నిర్ణయాలు": "Resolutions",
  "కార్యక్రమాలు": "Activities",
  "కొత్త సమావేశం / New Meeting": "New Meeting",
  "కొత్త సమావేశం": "New Meeting",
  "రాబోయే సమావేశాలు": "Upcoming Meetings",
  "గత సమావేశాలు": "Past Meetings",
  "నెలవారీ సమావేశం": "Monthly Meeting",
  "ఆఫ్‌లైన్": "Offline",
  "ఆన్‌లైన్": "Online",
  "హాజరు": "Present",
  "గైర్హాజరు": "Absent",
  "ప్రింట్ / PDF": "Print / PDF",
  "ప్రింట్": "Print",
  "సవరించు": "Edit",
  "ఇంకా రికార్డ్ చేయలేదు.": "No records yet.",
  "ఇంకా రికార్డ్ చేయలేదు": "No records yet",

  // Income
  "ఆదాయం మరియు విరాళాల నమోదు": "Record Income & Donations",
  "రసీదులు జారీ చేయండి": "Issue receipts",
  "తేదీ": "Date",
  "తేది": "Date",
  "మొత్తం (₹)": "Amount (₹)",
  "మొత్తం": "Amount",
  "చెల్లించినవారి పేరు": "Payer Name",
  "ఫోన్ నంబర్": "Phone Number",
  "ఇమెయిల్ చిరునామా (రసీదు పంపబడుతుంది)": "Email Address (receipt will be sent)",
  "ఇమెయిల్ చిరునామా": "Email Address",
  "ఆదాయ రకం": "Income Type",
  "విరాళం": "Donation",
  "నమోదు రుసుము": "Registration Fee",
  "ఇతరం": "Other",
  "కరెన్సీ": "Currency",

  // Expenses
  "ఖర్చులు మరియు ఆర్థిక సహాయం నమోదు": "Record Expenses & Aid",
  "ఖర్చులు": "Expenses",
  "ఖర్చు": "Expense",
  "చెల్లింపులు నమోదు చేయండి": "Record payments",
  "గ్రహీత పేరు": "Recipient Name",
  "ఖర్చు రకం": "Expense Type",
  "ఆర్థిక సహాయం / ధర్మం": "Financial Aid / Charity",
  "ఆర్థిక సహాయం": "Financial Aid",
  "ధర్మం": "Charity",
  "ఖాతా (చెల్లించబడేది)": "Account (paid from)",
  "— సాధారణ ఖాతా —": "— General Account —",
  "సాధారణ ఖాతా": "General Account",
  "బ్యాంక్ ఖాతా": "Bank Account",
  "బ్యాంకు ఖాతా": "Bank Account",

  // Loan requests
  "అప్పు అభ్యర్థనలు": "Loan Requests",
  "అభ్యర్థనలు": "Requests",

  // Cash flow
  "సొసైటీ నగదు ప్రవాహం": "Society Cash Flow",
  "నగదు ప్రవాహ నివేదిక": "Cash Flow Statement",
  "నెల పట్టిక": "Monthly",
  "3 నెలల పట్టిక": "3 Months",
  "6 నెలల పట్టిక": "6 Months",
  "సంవత్సర పట్టిక": "Yearly",
  "బ్యాంకులో": "In Bank",
  "అకౌంటెంట్ / చిల్లర": "Cashier / Petty Cash",
  "అకౌంటెంట్": "Cashier",
  "అధ్యక్షుడు": "President",
  "సభ్యుల వద్ద ఉన్న మొత్తం": "With Members",
  "+ ఆదాయం": "+ Income",
  "+ ఖర్చు": "+ Expense",
  "ఆదాయం": "Income",

  // Accounts (committee)
  "కమిటీ ఖాతాలు – నెలవారీ అప్పు నమోదు": "Committee Accounts — Monthly Loan Entry",
  "కమిటీ ఖాతాలు - నెలవారీ అప్పు నమోదు": "Committee Accounts — Monthly Loan Entry",
  "సొసైటీ": "Society",
  "బేస్ కరెన్సీ ఖాతాల కేంద్రంలో సెట్ చేయబడింది": "Base currency is set in the Accounts Hub",
  "సభ్యుల చెల్లింపులు మరియు కొత్త అప్పులు": "Member payments and new loans",
  "సభ్యుని ID": "Member ID",
  "ఉదా. A/0001": "e.g. A/0001",
  "గమనికలు": "Notes",
  "అప్పు తీసుకున్న వారి పేరు": "Borrower Name",

  // Master ledger
  "కమిటీ ఖాతాల నుండి ప్రత్యక్ష నమోదులు": "Direct entries from committee accounts",
  "ఎక్సెల్ డౌన్‌లోడ్": "Excel Download",
  "పిడిఎఫ్ డౌన్‌లోడ్": "PDF Download",
  "పేరు": "Name",
  "పాత బాకీ": "Prev. Balance",
  "అసలు జమ": "Principal Paid",
  "వడ్డీ జమ": "Interest Paid",
  "కొత్త అప్పు": "New Loan",
  "మొత్తం బాకీ": "Total Balance",
  "లోడ్ అవుతోంది…": "Loading…",
  "సభ్యులు లేరు": "No members",
};

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE"]);
const ORIG_ATTR = "data-mbr-orig";

function shouldSkip(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p && p.nodeType === 1) {
    const el = p as HTMLElement;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute("data-notranslit")) return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    p = p.parentNode;
  }
  return false;
}

function translateNode(node: Text, toEnglish: boolean) {
  const orig = (node as any)[ORIG_ATTR] ?? node.nodeValue ?? "";
  if (!(node as any)[ORIG_ATTR]) (node as any)[ORIG_ATTR] = orig;

  if (!toEnglish) {
    if (node.nodeValue !== orig) node.nodeValue = orig;
    return;
  }
  const trimmed = orig.trim();
  if (!trimmed) return;
  const hit = TE_EN[trimmed];
  if (hit && node.nodeValue !== hit) {
    // Preserve surrounding whitespace
    const lead = orig.match(/^\s*/)?.[0] ?? "";
    const tail = orig.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = lead + hit + tail;
  }
}

function walk(root: Node, toEnglish: boolean) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let cur = tw.nextNode();
  while (cur) { nodes.push(cur as Text); cur = tw.nextNode(); }
  for (const n of nodes) translateNode(n, toEnglish);
}

export function AutoTransliterate() {
  const { lang } = useI18n();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const toEnglish = lang === "en";
    let applying = false;
    const apply = (fn: () => void) => {
      applying = true;
      try { fn(); } finally { applying = false; }
    };
    apply(() => walk(document.body, toEnglish));

    const obs = new MutationObserver((muts) => {
      if (applying) return;
      apply(() => {
        for (const m of muts) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) walk(n, toEnglish);
            else if (n.nodeType === 3 && !shouldSkip(n)) translateNode(n as Text, toEnglish);
          });
          if (m.type === "characterData" && m.target.nodeType === 3 && !shouldSkip(m.target)) {
            // App re-rendered this text node: reset cached original then re-translate.
            delete (m.target as any)[ORIG_ATTR];
            translateNode(m.target as Text, toEnglish);
          }
        }
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [lang]);
  return null;
}
