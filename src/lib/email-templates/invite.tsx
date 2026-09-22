import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'
import { EmailShell, button, h1, small, text, linkStyle } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <EmailShell preview={`You've been invited to ${siteName}`}>
    <Text style={h1}>You&apos;ve been invited</Text>
    <Text style={text}>
      {siteName} is a digital notary: it stamps a permanent, verifiable
      fingerprint of your files onto the blockchain. Accept your invitation to
      get started.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={{ ...small, marginTop: '22px' }}>
      Button not working? Use this link:{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        {confirmationUrl}
      </Link>
    </Text>
  </EmailShell>
)

export default InviteEmail
