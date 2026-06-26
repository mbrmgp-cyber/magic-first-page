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
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{siteName} login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>చిట్వేల్ హెల్ప్ లైన్ సొసైటీ</Text>
        <Heading style={h1}>Login Link / లాగిన్ లింక్</Heading>
        <Text style={text}>
          Please click the button below to login. ఈ లింక్ కొద్దిసేపు మాత్రమే పనిచేస్తుంది.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Login / లాగిన్
        </Button>
        <Text style={footer}>
          If you did not request this link, please ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '28px 26px', borderTop: '6px solid #f97316' }
const brand = { fontSize: '16px', fontWeight: 'bold' as const, color: '#9a3412', margin: '0 0 14px' }
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
