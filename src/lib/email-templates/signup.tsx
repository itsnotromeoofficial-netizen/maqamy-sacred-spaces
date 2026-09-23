import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  token: string
}

export const SignupEmail = ({ siteName, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${siteName} verification code`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MAQAMY</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Enter this code on the {siteName} website to finish creating your account.
        </Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={text}>This code expires in one hour and can be used once.</Text>
        <Text style={footer}>
          If you didn&rsquo;t create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, Cambria, Times New Roman, serif',
}
const container = { padding: '32px 28px', maxWidth: '520px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '6px',
  color: '#B08D4F',
  margin: '0 0 28px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 'normal' as const,
  color: '#1B3A2B',
  margin: '0 0 18px',
}
const text = {
  fontSize: '15px',
  color: '#4b5550',
  lineHeight: '1.7',
  margin: '0 0 22px',
  fontFamily: 'Arial, sans-serif',
}
const codeBox = {
  backgroundColor: '#F7F2E8',
  border: '1px solid #E2D6BC',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const code = {
  fontSize: '34px',
  letterSpacing: '10px',
  color: '#1B3A2B',
  margin: '0',
  fontFamily: 'Arial, sans-serif',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '30px 0 0',
  fontFamily: 'Arial, sans-serif',
}
