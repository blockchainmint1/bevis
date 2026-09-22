import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'
import { EmailShell, button, h1, small, text, linkStyle } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail?: string
  email?: string
  newEmail?: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={`Confirm your new ${siteName} email address`}>
    <Text style={h1}>Confirm your new email</Text>
    <Text style={text}>
      We received a request to change the email on your {siteName} account
      {oldEmail ? ` from ${oldEmail}` : ''}
      {newEmail ? ` to ${newEmail}` : ''}. Confirm it below.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm this address
    </Button>
    <Text style={{ ...small, marginTop: '22px' }}>
      Button not working? Use this link:{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={small}>
      If you didn&apos;t request this change, ignore this email and nothing
      happens.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
