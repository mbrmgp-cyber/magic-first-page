export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  note,
}: MagicLinkEmailProps) => {
  const now = new Date()
  const sentAt = now.toUTCString()
  const uniqueId = `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`
  const appName = siteName || 'MBR APP'
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{appName} login link · {sentAt}</Preview>
    <Body style={main}>
      {/* Hidden preheader to ensure unique content per email (prevents Gmail from collapsing repeated messages) */}
      <span style={hidden}>
        Login request generated {sentAt} · ref {uniqueId}
      </span>
      <Container style={container}>
        <Text style={brand}>{appName}</Text>
        <Heading style={h1}>Login Link / లాగిన్ లింక్</Heading>
        {note ? <Text style={noteStyle}>{note}</Text> : null}
        <Text style={text}>
          Please click the button below to login to {appName}. ఈ లింక్ కొద్దిసేపు మాత్రమే పనిచేస్తుంది.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Login / లాగిన్
        </Button>
        <Text style={sentAtStyle}>
          Sent at: {sentAt}
        </Text>
        <Text style={footer}>
          If you did not request this link, please ignore this email.
          <br />— {appName} Team
          <br />
          <span style={refStyle}>Ref: {uniqueId}</span>
        </Text>
      </Container>
    </Body>
  </Html>
  )
}
