import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'
import { CodeBlock, EmailShell, button, h1, small, text, linkStyle } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl?: string
  recipient?: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <EmailShell preview={`Confirm your ${siteName} account`}>
    <Text style={h1}>Welcome to {siteName}</Text>
    {token ? (
      <>
        <Text style={text}>
          Enter this code in the app to finish setting up your account and back
          up your assets.
        </Text>
        <CodeBlock token={token} />
      </>
    ) : (
      <Text style={text}>
        Confirm your email address to finish setting up your account.
      </Text>
    )}
    <Button style={button} href={confirmationUrl}>
      Confirm my email
    </Button>
    <Text style={{ ...small, marginTop: '22px' }}>
      Button not working? Use this link:{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={small}>
      If this wasn&apos;t you, no account is created — just ignore this email.
    </Text>
  </EmailShell>
)

export default SignupEmail
