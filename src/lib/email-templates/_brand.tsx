import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * Shared BEVIS email shell — numismatic dark header, bone paper body,
 * struck-gold accents. Email clients are unforgiving: inline styles only,
 * web-safe font stacks, table-free layout, white page background.
 */

export const brand = {
  ink: '#0b0b10',
  paper: '#ffffff',
  surface: '#faf8f4',
  border: '#e7e2d7',
  text: '#2a2a2f',
  muted: '#7b7a76',
  gold: '#c8a köln',
} as const

const GOLD = '#b08d2f'
const GOLD_SOFT = '#f5efdd'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: 0,
  padding: '24px 0',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  border: '1px solid #e7e2d7',
  borderRadius: '14px',
  overflow: 'hidden' as const,
  backgroundColor: '#ffffff',
}

export const header = {
  backgroundColor: '#0b0b10',
  padding: '22px 28px',
}

export const wordmark = {
  margin: 0,
  color: '#e9e2cf',
  fontSize: '15px',
  letterSpacing: '6px',
  fontWeight: 'bold' as const,
  fontFamily: "Georgia, 'Times New Roman', serif",
}

export const tagline = {
  margin: '6px 0 0',
  color: '#8c8878',
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  fontFamily: 'Arial, Helvetica, sans-serif',
}

export const content = { padding: '30px 28px 8px' }

export const h1 = {
  margin: '0 0 14px',
  fontSize: '24px',
  lineHeight: '1.25',
  color: '#0b0b10',
  fontFamily: "Georgia, 'Times New Roman', serif",
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#2a2a2f',
  margin: '0 0 18px',
  fontFamily: 'Arial, Helvetica, sans-serif',
}

export const small = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#7b7a76',
  margin: '0 0 10px',
  fontFamily: 'Arial, Helvetica, sans-serif',
}

export const button = {
  display: 'inline-block',
  backgroundColor: GOLD,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  fontFamily: 'Arial, Helvetica, sans-serif',
  borderRadius: '8px',
  padding: '13px 26px',
  textDecoration: 'none',
}

export const codeBox = {
  backgroundColor: GOLD_SOFT,
  border: '1px solid #e6d9b0',
  borderRadius: '12px',
  padding: '18px 20px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

export const codeText = {
  margin: 0,
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '30px',
  letterSpacing: '9px',
  fontWeight: 'bold' as const,
  color: '#0b0b10',
}

export const linkStyle = { color: GOLD, wordBreak: 'break-all' as const }

export const hr = { borderColor: '#e7e2d7', margin: '26px 0 16px' }

export const footerText = {
  fontSize: '11px',
  lineHeight: '1.7',
  color: '#9a978f',
  margin: 0,
  fontFamily: 'Arial, Helvetica, sans-serif',
}

export function EmailShell({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={wordmark}>BEVIS</Text>
            <Text style={tagline}>Blockchain notary</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Section style={{ padding: '0 28px 26px' }}>
            <Hr style={hr} />
            <Text style={footerText}>
              BEVIS — Blockchain-enabled Verification &amp; Information Service, by
              Rearden Metals Pte Ltd, 25B Loyang Crescent #03-15, Singapore 506817.
              <br />
              Part of the{' '}
              <Link href="https://honest.money" style={linkStyle}>
                honest.money
              </Link>{' '}
              ecosystem.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function CodeBlock({ token }: { token: string }) {
  return (
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
  )
}
