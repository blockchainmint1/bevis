import * as React from 'react'

import { Button, Link, Text } from '@react-email/components'
import { CodeBlock, EmailShell, button, h1, small, text, linkStyle } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <EmailShell preview={`Reset your ${siteName} password`}>
    <Text style={h1}>Reset your password</Text>
    {token ? (
      <>
        <Text style={text}>You can enter this code in the app:</Text>
        <CodeBlock token={token} />
      </>
    ) : null}
    <Text style={text}>Or set a new password here:</Text>
    <Button style={button} href={confirmationUrl}>
      Choose a new password
    </Button>
    <Text style={{ ...small, marginTop: '22px' }}>
      Button not working? Use this link:{' '}
      <Link href={confirmationUrl} style={linkStyle}>
        {confirmationUrl}
      </Link>
    </Text>
    <Text style={small}>
      Didn&apos;t request this? Your password stays unchanged.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
