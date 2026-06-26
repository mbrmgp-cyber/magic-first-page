import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";

interface Props {
  siteName: string;
  title: string;
  whenText: string;
  meetingType: string;
  location?: string | null;
  meetingLink?: string | null;
  agenda?: string | null;
}

export const MeetingInviteEmail = ({ siteName, title, whenText, meetingType, location, meetingLink, agenda }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${siteName} — ${title} (${whenText})`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{siteName}</Text>
        <Heading style={h1}>సమావేశ ఆహ్వానం / Meeting Invitation</Heading>
        <Section style={card}>
          <Text style={label}>శీర్షిక / Title</Text>
          <Text style={value}>{title}</Text>
          <Text style={label}>తేదీ &amp; సమయం / Date &amp; Time</Text>
          <Text style={value}>{whenText}</Text>
          <Text style={label}>విధానం / Mode</Text>
          <Text style={value}>{meetingType}</Text>
          {meetingLink ? (
            <>
              <Text style={label}>లింక్ / Link</Text>
              <Link href={meetingLink} style={linkStyle}>{meetingLink}</Link>
            </>
          ) : null}
          {location ? (
            <>
              <Text style={label}>వేదిక / Location</Text>
              <Text style={value}>{location}</Text>
            </>
          ) : null}
          {agenda ? (
            <>
              <Text style={label}>అజెండా / Agenda</Text>
              <Text style={{ ...value, whiteSpace: "pre-wrap" }}>{agenda}</Text>
            </>
          ) : null}
        </Section>
        <Text style={footer}>దయచేసి సమావేశానికి హాజరు కండి. / Please attend the meeting.</Text>
      </Container>
    </Body>
  </Html>
);

export default MeetingInviteEmail;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { maxWidth: "600px", margin: "0 auto", padding: "28px 26px", borderTop: "6px solid #f97316" };
const brand = { fontSize: "16px", fontWeight: "bold" as const, color: "#9a3412", margin: "0 0 14px" };
const h1 = { fontSize: "22px", fontWeight: "bold" as const, color: "#111827", margin: "0 0 18px" };
const card = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "16px 18px" };
const label = { fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#9a3412", margin: "10px 0 2px" };
const value = { fontSize: "14px", color: "#111827", margin: "0" };
const linkStyle = { fontSize: "14px", color: "#c2410c", wordBreak: "break-all" as const };
const footer = { fontSize: "12px", color: "#6b7280", margin: "22px 0 0" };
