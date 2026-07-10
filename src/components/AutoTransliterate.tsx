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
  "సభ్యుల వివరాలు": "Member Details",
  "సభ్యుడిని చేర్చు": "Add Member",
  "సభ్యుని చేర్చు": "Add Member",
  "కొత్త సభ్యుడు": "New Member",
  "వివరాలు & Loans": "Details & Loans",
  "వివరాలు & లోన్లు": "Details & Loans",
  "ఖాతాల కేంద్రం": "Accounts Hub",
  "Accounts Hub / అకౌంట్స్ బాక్స్": "Accounts Hub",
  "మాస్టర్ లెడ్జర్": "Master Ledger",
  "మాస్టర్ లెడ్జర్ చూడండి →": "View Master Ledger →",
  "మాస్టర్ లెడ్జర్ చూడండి": "View Master Ledger",
  "వెనుకకు": "Back",
  "లోడ్ అవుతోంది": "Loading",
  "సేవ్ అవుతోంది…": "Saving…",
  "సేవ్ చేయండి": "Save",
  "సవరించు": "Edit",
  "మార్చండి": "Edit",
  "డిలీట్": "Delete",
  "రద్దు": "Cancel",
  "అందరూ": "All",
  "ఆమోదం": "Approved",
  "తిరస్కరించబడింది": "Rejected",

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
  "ఖాతా (జమ చేయబడేది)": "Account (credited to)",
  "రసీదును సేవ్ చేయండి": "Save Receipt",
  "ఇటీవలి రసీదులు": "Recent Receipts",
  "గమనికలు": "Notes",
  "చెల్లించినవారి పేరు అవసరం": "Payer name required",
  "సరైన ఈమెయిల్ చిరునామా అవసరం": "Valid email address required",

  // Expenses
  "ఖర్చులు / Expenses": "Expenses",
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
  "కారణం / గమనికలు": "Reason / Notes",
  "ఖర్చును సేవ్ చేయండి": "Save Expense",
  "ఇటీవలి ఖర్చులు": "Recent Expenses",
  "నమోదులు లేవు.": "No entries yet.",
  "నమోదులు లేవు": "No entries yet",
  "మార్పిడి రేటు": "Exchange Rate",

  // Loan requests
  "Loan Requests · అప్పు అభ్యర్థనలు": "Loan Requests",
  "Loan Requests — Admin": "Loan Requests — Admin",
  "Loan Requests ...": "Loan Requests",
  "అప్పు అభ్యర్థనలు": "Loan Requests",
  "అభ్యర్థనలు": "Requests",
  "షూరిటీ సమ్మతి కోసం ఎదురుచూస్తోంది — అప్పటివరకు ఆమోదం ఇవ్వలేరు": "Awaiting surety consent — approval is disabled until then",
  "షూరిటీ తిరస్కరించారు — దరఖాస్తు ముందుకు సాగదు": "Surety declined — the application cannot proceed",
  "ఆమోదించు": "Approve",
  "తిరస్కరించు": "Reject",
  "బ్యాంక్ ట్రాన్సాక్షన్ నెం. / UTR No": "Bank Transaction No. / UTR No",

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
  "పెండింగ్ వడ్డీ": "Pending Interest",
  "వచ్చినది": "Income",
  "పోయినది": "Expense",
  "మిగులు": "Balance",
  "ఆదాయ వివరాలు": "Income Details",
  "ఖర్చు వివరాలు": "Expense Details",
  "ఈ కాలంలో ఆదాయం లేదు.": "No income in this period.",
  "ఈ కాలంలో ఖర్చులు లేవు.": "No expenses in this period.",
  "నమోదు రుసుములు": "Registration Fees",
  "విరాళాలు": "Donations",
  "అసలు వసూలు": "Principal Collected",
  "వడ్డీ వసూలు": "Interest Collected",
  "ఇతర ఆదాయం": "Other Income",
  "+ ఆదాయం": "+ Income",
  "+ ఖర్చు": "+ Expense",
  "ఆదాయం": "Income",

  // Accounts (committee)
  "కమిటీ ఖాతాలు – నెలవారీ అప్పు నమోదు": "Committee Accounts — Monthly Loan Entry",
  "కమిటీ ఖాతాలు - నెలవారీ అప్పు నమోదు": "Committee Accounts — Monthly Loan Entry",
  "సొసైటీ": "Society",
  "చిట్వేల్ హెల్ప్ లైన్ సొసైటీ": "Chitvel Help Line Society",
  "చిట్వేల్ హెల్ప్‌లైన్ సొసైటీ": "Chitvel Help Line Society",
  "బేస్ కరెన్సీ ఖాతాల కేంద్రంలో సెట్ చేయబడింది": "Base currency is set in the Accounts Hub",
  "సభ్యుల చెల్లింపులు మరియు కొత్త అప్పులు": "Member payments and new loans",
  "సభ్యుని ID": "Member ID",
  "ఉదా. A/0001": "e.g. A/0001",
  "అప్పు తీసుకున్న వారి పేరు": "Borrower Name",
  "పాత అప్పు": "Old Loan",
  "అప్పు మొత్తం (బాకీ)": "Loan Amount (Due)",
  "నెలవారీ వడ్డీ": "Monthly Interest",
  "ఈ రోజు కొత్త అప్పు": "Today's New Loan",
  "కొత్త అప్పు మొత్తం": "New Loan Amount",
  "వడ్డీ రేటు (% నెలవారీ)": "Interest Rate (% monthly)",
  "అప్పు చేసిన వారి సంతకం": "Borrower Signature",
  "షూరిటీ సంతకం + ID NO": "Surety Signature + ID No",
  "ఫైల్ పంపండి": "Send File",
  "వ్యక్తిగత పిడిఎఫ్": "Individual PDF",
  "మొత్తం పిడిఎఫ్": "Full PDF",
  "లోగో అప్‌లోడ్": "Upload Logo",

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

  // Member details
  "తండ్రి": "Father",
  "తండ్రి పేరు": "Father Name",
  "చేరిన తేదీ": "Joined Date",
  "చేరిన తేది": "Joined Date",
  "పరిచయం": "Introduced By",
  "పూర్తి పేరు *": "Full Name *",
  "పూర్తి పేరు": "Full Name",
  "ఫోటో ఎంచుకోండి": "Choose Photo",
  "ఫోటో మార్చండి": "Change Photo",
  "అడ్రస్": "Address",
  "బ్లడ్ గ్రూప్": "Blood Group",
  "కమిటీ Fee": "Committee Fee",
  "కమిటీ ఫీ": "Committee Fee",
  "పరిచయం చేసిన సభ్యుడు": "Introducing Member",
  "— ఎవరూ లేరు —": "— None —",
  "పరిచయస్తుడి వివరాలు": "Reference Details",
  "పరిచయస్తుడు పేరు": "Introduced By Name",
  "పరిచయం చేసిన వారి ఐడి నంబర్": "Introducer ID Number",
  "సభ్యత్వం యాక్టివ్": "Membership Active",
  "ఇనాక్టివ్ చేస్తే సదుపాయాలు పనిచేయవు": "Features will not work when inactive",
  "ఐడి నెంబర్ (లాక్ అయింది)": "ID Number (Locked)",
  "ఐడి నెంబర్ — ఇప్పుడు ఒకసారి మార్చవచ్చు. Save చేస్తే లాక్ అవుతుంది.": "ID Number — can be changed once now. It will be locked after saving.",
  "సభ్యుడు తొలగించబడ్డారు": "Member deleted",
  "ఫైల్ 5MB మించరాదు": "File must be under 5MB",
  "పేరు మరియు Email ఇవ్వండి": "Enter name and email",
  "సభ్యుడు చేర్చబడ్డారు": "Member added",
  "PDF తయారవుతోంది…": "Preparing PDF…",
  "PDF డౌన్‌లోడ్": "PDF Download",
  "PDF డౌన్‌లోడ్ సిద్ధమైంది": "PDF download is ready",
  "PDF తయారు చేయలేకపోయాం": "Could not create PDF",

  // Live Chit Auction
  "లైవ్ చిట్ ఆక్షన్ రూమ్": "Live Chit Auction Room",
  "Group Setup · గ్రూప్ సెటప్": "Group Setup",
  "గ్రూప్ సెటప్": "Group Setup",
  "Group + · గ్రూప్": "Group",
  "గ్రూప్": "Group",
  "బిగినింగ్ Date · Start": "Start Date",
  "బిగినింగ్ Date": "Start Date",
  "Total Months · మొత్తం నెలలు": "Total Months",
  "మొత్తం నెలలు": "Total Months",
  "Once a month · నెలకు ఒకసారి": "Once a month",
  "నెలకు ఒకసారి": "Once a month",
  "సభ్యుడిని ఎంచుకోండి (ID / పేరు)": "Select a member to add (ID / Name)",
  "Select a member to add (ID / Name)": "Select a member to add (ID / Name)",
  "Minimize / తగ్గించు": "Minimize",
  "Total Amount · మొత్తం అమౌంట్": "Total Amount",
  "Group Terms · నిబంధనలు": "Group Terms",
  "No terms specified yet · నిబంధనలు ఇంకా జోడించలేదు.": "No terms specified yet.",
  "My Calculator · నా లెక్క": "My Calculator",
  "Winner · విజేత": "Winner",
  "Foreman Benefit · ఫోర్‌మ్యాన్": "Foreman Benefit",
  "Auction Close Time · క్లోజ్": "Auction Close Time",
  "Terms · నిబంధనలు": "Terms",
  "లైవ్ చీటీ · Live Auction": "Live Auction",
  "క్లోజ్ · Finalize": "Finalize",
  "Start · స్టార్ట్": "Start",
  "Close · క్లోజ్": "Close",
  "Interest · ఇన్ట్రెస్ట్": "Interest",
  "విజేత ఎవరు · Winner": "Winner",
  "పాస్ట్ డిటైల్స్ · Past History": "Past History",
  "Payments · చెల్లింపులు": "Payments",
  "సభ్యులు": "members",

  // Board Elections
  "Back / వెనుకకు": "Back",
  "కొత్త ఎన్నిక": "New Election",
  "కొత్త ఎన్నిక షెడ్యూల్": "Schedule New Election",
  "Board Elections · బోర్డు ఎన్నికలు": "Board Elections",
  "బోర్డు ఎన్నికలు": "Board Elections",
  "బోర్డు ఎన్నికలు — షెడ్యూల్, నామినేషన్లు, ఓటింగ్ & ఫలితాలు": "Board Elections — Schedule, Nominations, Voting & Results",
  "శీర్షిక": "Title",
  "వివరణ (ఐచ్ఛికం)": "Description (Optional)",
  "వివరణ": "Description",
  "పదవులు (కామాతో వేరు చేయండి)": "Positions (comma separated)",
  "పదవులు": "Positions",
  "నామినేషన్ గడువు": "Nomination Deadline",
  "ఎన్నిక తేదీ & సమయం": "Election Date & Time",
  "సృష్టించు": "Create",
  "ఇంకా ఏ ఎన్నిక షెడ్యూల్ చేయలేదు.": "No elections scheduled yet.",
  "ఇంకా ఏ ఎన్నిక షెడ్యూల్ చేయలేదు": "No elections scheduled yet",
  "ఎన్నిక": "Election",
  "నామినేషన్ వేయండి": "Nominate",
  "నామినేషన్లు": "Nominations",
  "ఓటు వేయండి": "Vote",
  "ఫలితాలు": "Results",
  "నామినేషన్లు ప్రస్తుతం తెరువబడలేదు.": "Nominations are not open right now.",
  "ఇంకా నామినేషన్లు లేవు.": "No nominations yet.",
  "ఓటింగ్ ప్రస్తుతం తెరువబడలేదు.": "Voting is not open right now.",
  "కార్యవర్గ సభ్యులు మాత్రమే ఓటు వేయగలరు.": "Only committee members can vote.",
  "అభ్యర్థులు లేరు.": "No candidates.",
  "మీ ఓటు నమోదైంది": "Your vote has been recorded",
  "ప్రాథమిక ఫలితాలు — ఎన్నిక ఇంకా పూర్తి కాలేదు.": "Preliminary results — election is not completed yet.",

  // Designs Studio
  "డిజైన్స్ స్టూడియో": "Designs Studio",
  "లెటర్ ప్యాడ్ టెంప్లేట్‌ను ఎంచుకోండి": "Choose a Letter Pad Template",
  "రసీదు టెంప్లేట్‌ను ఎంచుకోండి": "Choose a Receipt Template",
  "వివరాలు నింపండి — ప్రివ్యూ లైవ్": "Fill details — live preview",
  "STEP 1 • కార్డ్ టైప్ ఎంచుకోండి": "STEP 1 • Choose Card Type",
  "కార్డ్ టైప్ ఎంచుకోండి": "Choose Card Type",
  "Normal ID Card / నార్మల్": "Normal ID Card",
  "Keychain Type / కీ చైన్": "Keychain Type",
  "Print Dimensions / ప్రింట్ సైజ్": "Print Dimensions",
  "ప్రింట్ సైజ్": "Print Size",
  "Change template / టెంప్లేట్ మార్చండి": "Change template",
  "టెంప్లేట్ మార్చండి": "Change template",
  "ముందు / Front": "Front",
  "వెనుక / Back": "Back",
  "ముందు": "Front",
  "వెనుక": "Back",
  "Save Design — Apply to All Members / అందరికీ అప్లై చేయండి": "Save Design — Apply to All Members",
  "ఈ డిజైన్ సేవ్ చేస్తే ఆర్గనైజేషన్ లోని సభ్యులందరికీ ఇదే ఐడి కార్డ్ ఆటోమేటిక్ గా తయారు అవుతుంది.": "Saving this design will automatically apply the same ID card to all members in the organization.",
  "ప్రెసిడెంట్ పేరు": "President Name",
  "ప్రెసిడెంట్ సంతకం": "President Signature",
  "సంతకం": "Signature",
  "లోగో": "Logo",
  "సంస్థ పేరు": "Organization Name",
  "స్లోగన్": "Slogan",
  "రిజిస్ట్రేషన్ నెం": "Registration No.",
  "సభ్యుడి ఫోటో": "Member Photo",
  "సభ్యుడి పేరు": "Member Name",
  "సభ్యత్వ నెం": "Member ID",
  "పదవి": "Designation",
  "గ్రామం": "Village",
  "పిన్ కోడ్": "Pincode",
  "వెనుక మేటర్": "Back Side Text",
  "ప్రమాణం": "Oath",
  "చిన్న లోగో": "Small Logo",
};

const TE_ONLY: Record<string, string> = {
  "కొత్త సమావేశం / New Meeting": "కొత్త సమావేశం",
  "Accounts Hub / అకౌంట్స్ బాక్స్": "ఖాతాల కేంద్రం",
  "ప్రింట్ / PDF": "ప్రింట్ / పిడిఎఫ్",
  "ఆర్థిక సహాయం / ధర్మం": "ఆర్థిక సహాయం / ధర్మం",
  "Loan Requests · అప్పు అభ్యర్థనలు": "అప్పు అభ్యర్థనలు",
  "Loan Requests — Admin": "అప్పు అభ్యర్థనలు — అడ్మిన్",
  "ఖర్చులు / Expenses": "ఖర్చులు",
  "సంతకం / Signature": "సంతకం",
  "ప్రూఫ్ / Proof": "ప్రూఫ్",
  "బ్యాంక్ ట్రాన్సాక్షన్ నెం. / UTR No": "బ్యాంక్ ట్రాన్సాక్షన్ నెం.",
  "Upload Membership Fee Receipt · సభ్యత్వం ఫీజు రసీదు అప్లోడ్": "సభ్యత్వం ఫీజు రసీదు అప్లోడ్",
  "వివరాలు & Loans": "వివరాలు & అప్పులు",
  "Reference Details · పరిచయస్తుడి వివరాలు": "పరిచయస్తుడి వివరాలు",
  "Introduced By Name · పరిచయస్తుడు పేరు": "పరిచయస్తుడు పేరు",
  "Introducer ID · పరిచయం చేసిన వారి ఐడి నంబర్": "పరిచయం చేసిన వారి ఐడి నంబర్",
  "Email Address (రసీదు పంపబడుతుంది)": "ఇమెయిల్ చిరునామా (రసీదు పంపబడుతుంది)",
  "Payer Name / పేరు": "చెల్లించినవారి పేరు",
  "Save Design — Apply to All Members / అందరికీ అప్లై": "డిజైన్ సేవ్ చేయండి — అందరికీ అప్లై చేయండి",
};

const EN_TE: Record<string, string> = Object.entries(TE_EN).reduce((acc, [te, en]) => {
  if (!acc[en]) acc[en] = TE_ONLY[te] ?? te;
  return acc;
}, {} as Record<string, string>);

Object.assign(EN_TE, {
  Dashboard: "డాష్‌బోర్డ్",
  Pending: "పెండింగ్",
  Approved: "ఆమోదించబడినవి",
  Rejected: "తిరస్కరించబడినవి",
  All: "అన్నీ",
  Active: "యాక్టివ్",
  Inactive: "ఇనాక్టివ్",
  pending: "పెండింగ్",
  approved: "ఆమోదించబడింది",
  rejected: "తిరస్కరించబడింది",
  "Record Expenses & Aid": "ఖర్చులు మరియు ఆర్థిక సహాయం నమోదు",
  "Record payments": "చెల్లింపులు నమోదు చేయండి",
  Date: "తేదీ",
  Amount: "మొత్తం",
  "Recipient Name": "గ్రహీత పేరు",
  "Expense Type": "ఖర్చు రకం",
  Currency: "కరెన్సీ",
  "Financial Aid / Charity": "ఆర్థిక సహాయం / ధర్మం",
  "General Account": "సాధారణ ఖాతా",
  "— General Account —": "— సాధారణ ఖాతా —",
  "Bank Account": "బ్యాంక్ ఖాతా",
  "Account (paid from)": "ఖాతా (చెల్లించబడేది)",
  "Reason / Notes": "కారణం / గమనికలు",
  "Save Expense": "ఖర్చును సేవ్ చేయండి",
  "Recent Expenses": "ఇటీవలి ఖర్చులు",
  "No entries yet.": "నమోదులు లేవు.",
  "Loan Requests": "అప్పు అభ్యర్థనలు",
  "No requests in this view.": "ఈ వీక్షణలో అభ్యర్థనలు లేవు.",
  "Approve Loan": "అప్పు ఆమోదించండి",
  "Payment Date": "చెల్లింపు తేదీ",
  "Interest %/month": "వడ్డీ %/నెల",
  Cancel: "రద్దు",
  "Save & Add to Ledger": "సేవ్ చేసి లెడ్జర్‌కు జోడించండి",
  "Member payments and new loans": "సభ్యుల చెల్లింపులు మరియు కొత్త అప్పులు",
  "Committee Accounts — Monthly Loan Entry": "కమిటీ ఖాతాలు — నెలవారీ అప్పు నమోదు",
  "Borrower Name": "అప్పు తీసుకున్న వారి పేరు",
  "Old Loan": "పాత అప్పు",
  "Today's New Loan": "ఈ రోజు కొత్త అప్పు",
  "Save": "సేవ్ చేయండి",
  "Send File": "ఫైల్ పంపండి",
  "Edit": "సవరించు",
  "Individual PDF": "వ్యక్తిగత పిడిఎఫ్",
  "Full PDF": "మొత్తం పిడిఎఫ్",
  "Member Details": "సభ్యుల వివరాలు",
  "Add Member": "సభ్యుడిని చేర్చు",
  "No members": "సభ్యులు లేరు",
  Loading: "లోడ్ అవుతోంది",
  "Loading…": "లోడ్ అవుతోంది…",
  Delete: "డిలీట్",
  Profile: "ప్రొఫైల్",
  "Loans / Interest": "అప్పులు / వడ్డీ",
  "Details & Loans": "వివరాలు & అప్పులు",
  "Change Photo": "ఫోటో మార్చండి",
  Phone: "ఫోన్",
  "Blood Group": "బ్లడ్ గ్రూప్",
  "Committee Fee": "కమిటీ ఫీ",
  "Membership Active": "సభ్యత్వం యాక్టివ్",
  "Current status:": "ప్రస్తుత స్థితి:",
  "View current receipt": "ప్రస్తుత రసీదు చూడండి",
  "Tap any tile to open the detailed module.": "వివరమైన మాడ్యూల్ తెరవడానికి ఏదైనా టైల్ నొక్కండి.",
  "Accounts Hub": "ఖాతాల కేంద్రం",
  "Loan Requests — Admin": "అప్పు అభ్యర్థనలు — అడ్మిన్",
  "Record Income & Donations": "ఆదాయం మరియు విరాళాల నమోదు",
  "Issue receipts": "రసీదులు జారీ చేయండి",
  "Payer Name": "చెల్లించినవారి పేరు",
  "Phone Number": "ఫోన్ నంబర్",
  "Email Address": "ఇమెయిల్ చిరునామా",
  "Income Type": "ఆదాయ రకం",
  Donation: "విరాళం",
  "Registration Fee": "నమోదు రుసుము",
  Other: "ఇతరం",
  "Account (credited to)": "ఖాతా (జమ చేయబడేది)",
  Notes: "గమనికలు",
  "Save Receipt": "రసీదును సేవ్ చేయండి",
  "Recent Receipts": "ఇటీవలి రసీదులు",
  "Society Cash Flow": "సొసైటీ నగదు ప్రవాహం",
  "Cash Flow Statement": "నగదు ప్రవాహ నివేదిక",
  "This Month": "నెల పట్టిక",
  "3 Months": "3 నెలల పట్టిక",
  "6 Months": "6 నెలల పట్టిక",
  Yearly: "సంవత్సర పట్టిక",
  "In Bank": "బ్యాంకులో",
  "Cashier / Petty Cash": "అకౌంటెంట్ / చిల్లర",
  "With Members": "సభ్యుల వద్ద ఉన్న మొత్తం",
  "Pending Interest": "పెండింగ్ వడ్డీ",
  Balance: "మిగులు",
  "Income Details": "ఆదాయ వివరాలు",
  "Expense Details": "ఖర్చు వివరాలు",
  "Registration Fees": "నమోదు రుసుములు",
  Donations: "విరాళాలు",
  "Principal Collected": "అసలు వసూలు",
  "Interest Collected": "వడ్డీ వసూలు",
  "Other Income": "ఇతర ఆదాయం",
  "Office Expenses": "ఆఫీసు ఖర్చులు",
  "Meeting Expenses": "మీటింగ్ ఖర్చులు",
  Miscellaneous: "ఇతరములు",
  "Designs Studio": "డిజైన్స్ స్టూడియో",
  "ID Card": "ఐడి కార్డ్",
  "Letter Pad": "లెటర్ ప్యాడ్",
  "Receipt Card": "రసీదు కార్డ్",
  "ID Card • Letter Pad • Receipt — Modular Templates": "ఐడి కార్డ్ • లెటర్ ప్యాడ్ • రసీదు — మాడ్యులర్ టెంప్లేట్లు",
  "Choose a Letter Pad Template": "లెటర్ ప్యాడ్ టెంప్లేట్‌ను ఎంచుకోండి",
  "Choose a Receipt Template": "రసీదు టెంప్లేట్‌ను ఎంచుకోండి",
  "Standard Header": "స్టాండర్డ్ హెడర్",
  "Watermark Centered": "వాటర్‌మార్క్ సెంటర్",
  "Left Sidebar Modern": "లెఫ్ట్ సైడ్‌బార్ మోడర్న్",
  "Classic Receipt": "క్లాసిక్ రసీదు",
  "Saffron Strip": "సాఫ్రాన్ స్ట్రిప్",
  "Minimal Line": "మినిమల్ లైన్",
  "Choose Card Type": "కార్డ్ టైప్ ఎంచుకోండి",
  "Normal ID Card": "నార్మల్ ఐడి కార్డ్",
  "Keychain Type": "కీ చైన్ టైప్",
  "Print Dimensions": "ప్రింట్ సైజ్",
  "Change template": "టెంప్లేట్ మార్చండి",
  Front: "ముందు",
  Back: "వెనుక",
  "Save Design — Apply to All Members": "డిజైన్ సేవ్ చేయండి — అందరికీ అప్లై చేయండి",
  "Selected:": "ఎంచుకున్నది:",
  "Legacy Saffron": "లెగసీ సాఫ్రాన్",
  "Logo": "లోగో",
  "Organization Name": "సంస్థ పేరు",
  "Slogan": "స్లోగన్",
  "Registration No.": "రిజిస్ట్రేషన్ నెం",
  "Member Photo": "సభ్యుడి ఫోటో",
  "Member Name (Big)": "సభ్యుడి పేరు",
  "Father's Name": "తండ్రి పేరు",
  "Designation": "పదవి",
  "Village": "గ్రామం",
  "Pincode": "పిన్ కోడ్",
  "Back Side Text": "వెనుక మేటర్",
  "Oath": "ప్రమాణం",
  Show: "చూపించు",
  Hidden: "దాచబడింది",
  Upload: "అప్‌లోడ్",
  Change: "మార్చండి",
  Clear: "క్లియర్",
  "Board Elections": "బోర్డు ఎన్నికలు",
  "Schedule New Election": "కొత్త ఎన్నిక షెడ్యూల్",
  Title: "శీర్షిక",
  "Description (Optional)": "వివరణ (ఐచ్ఛికం)",
  "Positions (comma separated)": "పదవులు (కామాతో వేరు చేయండి)",
  "Nomination Deadline": "నామినేషన్ గడువు",
  "Election Date & Time": "ఎన్నిక తేదీ & సమయం",
  Create: "సృష్టించు",
  "President, Secretary, Treasurer": "అధ్యక్షుడు, కార్యదర్శి, కోశాధికారి",
  "Live Chit Auction Room": "లైవ్ చిట్ ఆక్షన్ రూమ్",
  "Group Setup": "గ్రూప్ సెటప్",
  "Total Months": "మొత్తం నెలలు",
  "Once a month": "నెలకు ఒకసారి",
  Minimize: "తగ్గించు",
  "Select a member to add (ID / Name)": "సభ్యుడిని ఎంచుకోండి (ID / పేరు)",
  "Pick — e.g., A / 0003": "ఎంచుకోండి — ఉదా., A / 0003",
});

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE"]);
const ORIG_ATTR = "data-mbr-orig";
const ATTR_ORIG_PREFIX = "__mbrOrigAttr_";
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;

function shouldSkip(node: Node): boolean {
  let p: Node | null = node.parentNode;
  while (p && p.nodeType === 1) {
    const el = p as HTMLElement;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute("data-notranslit")) return true;
    if (el.getAttribute("translate") === "no") return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    p = p.parentNode;
  }
  return false;
}

function lookupPhrase(trimmed: string, lang: string): string | undefined {
  if (lang === "en") return TE_EN[trimmed];
  if (lang === "te") {
    if (TE_ONLY[trimmed]) return TE_ONLY[trimmed];
    if (EN_TE[trimmed]) return EN_TE[trimmed];
    const pending = /^(\d+)\s+pending$/i.exec(trimmed);
    if (pending) return `${pending[1]} పెండింగ్`;
    const countRequests = /^(\d+)\s+requests?$/i.exec(trimmed);
    if (countRequests) return `${countRequests[1]} అభ్యర్థనలు`;
  }
  return undefined;
}

function translateValue(value: string, lang: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const hit = lookupPhrase(trimmed, lang);
  if (!hit) {
    const mixed = translateMixedValue(value, lang);
    if (mixed !== undefined) return mixed;
    if (lang === "en") {
      const colon = /^(.+?)([:：])\s*(.*)$/.exec(trimmed);
      if (colon && TE_EN[colon[1]]) {
        const lead = value.match(/^\s*/)?.[0] ?? "";
        const tail = value.match(/\s*$/)?.[0] ?? "";
        return `${lead}${TE_EN[colon[1]]}${colon[2]} ${colon[3]}${tail}`;
      }
      if (trimmed.startsWith("చేరిన తేదీ:")) return value.replace("చేరిన తేదీ:", "Joined Date:");
      if (trimmed.startsWith("తండ్రి:")) return value.replace("తండ్రి:", "Father:");
      if (trimmed.startsWith("పరిచయం:")) return value.replace("పరిచయం:", "Introduced By:");
      if (trimmed.startsWith("కమిటీ Fee:")) return value.replace("కమిటీ Fee:", "Committee Fee:");
    }
    if (lang === "te") {
      if (trimmed.startsWith("Father:")) return value.replace("Father:", "తండ్రి:");
      if (trimmed.startsWith("Joined Date:")) return value.replace("Joined Date:", "చేరిన తేదీ:");
      if (trimmed.startsWith("Committee Fee:")) return value.replace("Committee Fee:", "కమిటీ ఫీ:");
      if (trimmed === "● Active") return value.replace("Active", "యాక్టివ్");
      if (trimmed === "● Inactive") return value.replace("Inactive", "ఇనాక్టివ్");
    }
    return value;
  }
  const lead = value.match(/^\s*/)?.[0] ?? "";
  const tail = value.match(/\s*$/)?.[0] ?? "";
  return lead + hit + tail;
}

const TELUGU_RE = /[\u0C00-\u0C7F]/;
const LATIN_RE = /[A-Za-z]/;

function cleanSeparators(s: string): string {
  return s
    .replace(/\s*([/·•])\s*([/·•])\s*/g, " $1 ")
    .replace(/^\s*[/·•—-]+\s*/g, "")
    .replace(/\s*[/·•—-]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function translateMixedValue(value: string, lang: string): string | undefined {
  const trimmed = value.trim();
  if (!TELUGU_RE.test(trimmed) || !LATIN_RE.test(trimmed)) return undefined;
  const lead = value.match(/^\s*/)?.[0] ?? "";
  const tail = value.match(/\s*$/)?.[0] ?? "";

  if (lang === "en") {
    let out = trimmed.replace(/\s*[([{][^()[\]{}]*[\u0C00-\u0C7F][^()[\]{}]*[)\]}]/g, "");
    out = out.split(/(\s*[/·•]\s*)/).map((part) => {
      const exact = TE_EN[part.trim()];
      return exact ? part.replace(part.trim(), exact) : part;
    }).join("");
    if (TELUGU_RE.test(out)) {
      const pieces = out.split(/[/·•]/).map((p) => p.trim()).filter(Boolean);
      const englishPieces = pieces.filter((p) => LATIN_RE.test(p) && !TELUGU_RE.test(p));
      if (englishPieces.length) {
        const suffix = trimmed.match(/[\u0C00-\u0C7F][^—–-]*([—–-]\s*[^/·•]+)$/)?.[1] ?? "";
        const englishParens = Array.from(trimmed.matchAll(/\(([A-Za-z][^)]+)\)/g)).map((m) => m[0]);
        out = englishPieces.join(" · ") + (englishParens.length ? ` ${englishParens.join(" ")}` : "") + suffix;
      }
    }
    out = cleanSeparators(out);
    return out ? lead + out + tail : undefined;
  }

  if (lang === "te") {
    let out = trimmed.replace(/\s*[([{][^()[\]{}]*[A-Za-z][^()[\]{}]*[)\]}]/g, "");
    const pieces = out.split(/[/·•]/).map((p) => p.trim()).filter(Boolean);
    const teluguPieces = pieces.filter((p) => TELUGU_RE.test(p));
    if (teluguPieces.length) out = teluguPieces.join(" / ");
    out = cleanSeparators(out);
    return out ? lead + out + tail : undefined;
  }

  return undefined;
}

function translateNode(node: Text, lang: string) {
  const orig = (node as any)[ORIG_ATTR] ?? node.nodeValue ?? "";
  if (!(node as any)[ORIG_ATTR]) (node as any)[ORIG_ATTR] = orig;

  const next = translateValue(orig, lang);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateAttrs(el: Element, lang: string) {
  if (el.hasAttribute("data-notranslit")) return;
  if (el.getAttribute("translate") === "no") return;
  for (const attr of TRANSLATABLE_ATTRS) {
    const current = el.getAttribute(attr);
    if (!current) continue;
    const key = ATTR_ORIG_PREFIX + attr;
    const orig = (el as any)[key] ?? current;
    if (!(el as any)[key]) (el as any)[key] = orig;
    const next = translateValue(orig, lang);
    if (current !== next) el.setAttribute(attr, next);
  }
}

function translateDocumentTitle(lang: string) {
  const el = document.documentElement;
  const key = "data-mbr-title-orig";
  const stored = el.getAttribute(key);
  const current = document.title;
  const storedEn = stored ? translateValue(stored, "en") : "";
  const storedTe = stored ? translateValue(stored, "te") : "";
  const orig = !stored || (current !== stored && current !== storedEn && current !== storedTe)
    ? current
    : stored;
  if (stored !== orig) el.setAttribute(key, orig);
  const next = translateValue(orig, lang);
  if (document.title !== next) document.title = next;
}

function walk(root: Node, lang: string) {
  if (root.nodeType === 1) translateAttrs(root as Element, lang);

  const ew = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      const el = n as Element;
      if (el.hasAttribute("data-notranslit")) return NodeFilter.FILTER_REJECT;
      if (el.getAttribute("translate") === "no") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const els: Element[] = [];
  let ec = ew.nextNode();
  while (ec) { els.push(ec as Element); ec = ew.nextNode(); }
  for (const el of els) translateAttrs(el, lang);

  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let cur = tw.nextNode();
  while (cur) { nodes.push(cur as Text); cur = tw.nextNode(); }
  for (const n of nodes) translateNode(n, lang);
}

export function AutoTransliterate() {
  const { lang } = useI18n();
  useEffect(() => {
    if (typeof document === "undefined") return;
    let applying = false;
    let applyTimer: number | undefined;
    const apply = (fn: () => void) => {
      applying = true;
      try { fn(); } finally {
        if (applyTimer) window.clearTimeout(applyTimer);
        applyTimer = window.setTimeout(() => { applying = false; }, 0);
      }
    };
    apply(() => {
      translateDocumentTitle(lang);
      walk(document.body, lang);
    });

    const obs = new MutationObserver((muts) => {
      if (applying) return;
      apply(() => {
        translateDocumentTitle(lang);
        for (const m of muts) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) walk(n, lang);
            else if (n.nodeType === 3 && !shouldSkip(n)) translateNode(n as Text, lang);
          });
          if (m.type === "characterData" && m.target.nodeType === 3 && !shouldSkip(m.target)) {
            // App re-rendered this text node: reset cached original then re-translate.
            delete (m.target as any)[ORIG_ATTR];
            translateNode(m.target as Text, lang);
          }
        }
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      obs.disconnect();
      if (applyTimer) window.clearTimeout(applyTimer);
    };
  }, [lang]);
  return null;
}
