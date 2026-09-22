import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'
import { CodeBlock, EmailShell, button, h1, small, text, linkStyle } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <EmailShell preview={`Your ${siteName} sign-in code`}>
    <Text style={h1}>Your sign-in code</Text>
    {token ? (
      <>
        <Text style={text}>
          Enter this code in {siteName} to sign in. It expires in a few minutes.
        </Text>
        <CodeBlock token={token} />
      </>
    ) : null}
    <Text style={text}>Or open {siteName} straight from this button:</Text>
    <Button style={button} href={confirmationUrl}>
      Sign in to {siteName}
    </Button>
    <Text style={{ ...small, marginTop: '22px' }}>
      Button not working? Use this link:{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={small}>
      If you didn&apos;t ask to sign in, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
