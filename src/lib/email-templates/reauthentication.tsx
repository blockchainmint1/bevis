import * as React from 'react'

import { Text } from '@react-email/components'
import { CodeBlock, EmailShell, h1, small, text } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Your BEVIS verification code">
    <Text style={h1}>Your verification code</Text>
    <Text style={text}>Enter this code to confirm it&apos;s really you.</Text>
    <CodeBlock token={token} />
    <Text style={small}>
      The code expires in a few minutes. If you didn&apos;t request it, ignore
      this email.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
