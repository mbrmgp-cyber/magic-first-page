import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  note?: string
}

export const MagicLinkEmail = ({
  confirmationUrl,
  note,
}: MagicLinkEmailProps) => {
  const now = new Date()
  const sentAt = now.toUTCString()
  const uniqueId = `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>MBR APP login link · {sentAt}</Preview>
    <Body style={main}>
      {/* Hidden preheader to ensure unique content per email (prevents Gmail from collapsing repeated messages) */}
      <span style={hidden}>
        Login request generated {sentAt} · ref {uniqueId}
      </span>
      <Container style={container}>
        <Text style={brand}>MBR APP</Text>
        <Heading style={h1}>Login Link / లాగిన్ లింక్</Heading>
        {note ? <Text style={noteStyle}>{note}</Text> : null}
        <Text style={text}>
          Please click the button below to login to MBR APP. ఈ లింక్ కొద్దిసేపు మాత్రమే పనిచేస్తుంది.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Login / లాగిన్
        </Button>
        <Text style={sentAtStyle}>
          Sent at: {sentAt}
        </Text>
        <Text style={footer}>
          If you did not request this link, please ignore this email.
          <br />— MBR APP Team
          <br />
          <span style={refStyle}>Ref: {uniqueId}</span>
        </Text>
      </Container>
    </Body>
  </Html>
  )
}

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '28px 26px', borderTop: '6px solid #f97316' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, color: '#9a3412', margin: '0 0 14px', letterSpacing: '1px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#f97316',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const hidden = { display: 'none', overflow: 'hidden', lineHeight: '1px', opacity: 0, maxHeight: 0, maxWidth: 0, fontSize: '1px', color: '#ffffff' as const }
const sentAtStyle = { fontSize: '11px', color: '#b0b0b0', margin: '18px 0 0' }
const refStyle = { fontSize: '10px', color: '#cccccc' }
