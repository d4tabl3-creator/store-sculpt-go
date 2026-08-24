import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const BRAND = {
  name: 'DªTªBLe',
  primary: '#6D4AFF',
  ink: '#14121F',
  muted: '#5C5870',
  border: '#E7E4F2',
  bg: '#F6F4FF',
  card: '#FFFFFF',
}

export const styles = {
  main: {
    backgroundColor: BRAND.bg,
    fontFamily:
      "'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '32px 0',
  },
  container: {
    backgroundColor: BRAND.card,
    border: `1px solid ${BRAND.border}`,
    borderRadius: '20px',
    margin: '0 auto',
    maxWidth: '520px',
    padding: '36px 32px',
  },
  brand: {
    color: BRAND.ink,
    fontSize: '24px',
    fontWeight: 800 as const,
    letterSpacing: '1px',
    margin: '0 0 24px',
    textDecoration: 'none',
  },
  h1: {
    color: BRAND.ink,
    fontSize: '22px',
    fontWeight: 700 as const,
    lineHeight: '1.3',
    margin: '0 0 16px',
  },
  text: {
    color: BRAND.muted,
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 18px',
  },
  button: {
    backgroundColor: BRAND.primary,
    borderRadius: '12px',
    color: '#FFFFFF',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 700 as const,
    padding: '14px 26px',
    textDecoration: 'none',
  },
  code: {
    backgroundColor: BRAND.bg,
    border: `1px solid ${BRAND.border}`,
    borderRadius: '12px',
    color: BRAND.ink,
    display: 'inline-block',
    fontSize: '28px',
    fontWeight: 800 as const,
    letterSpacing: '6px',
    padding: '14px 22px',
  },
  hintLink: {
    color: BRAND.primary,
    fontSize: '13px',
    wordBreak: 'break-all' as const,
  },
  footer: {
    borderTop: `1px solid ${BRAND.border}`,
    color: BRAND.muted,
    fontSize: '12px',
    lineHeight: '1.6',
    margin: '28px 0 0',
    paddingTop: '18px',
  },
}

export function BrandLayout({
  preview,
  siteUrl,
  children,
  footerNote,
}: {
  preview: string
  siteUrl: string
  children: React.ReactNode
  footerNote?: string
}) {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Link href={siteUrl} style={styles.brand}>
            {BRAND.name}
          </Link>
          <Section>{children}</Section>
          <Text style={styles.footer}>
            {footerNote ??
              'Si no solicitaste este correo, puedes ignorarlo sin problema.'}
            <br />
            {BRAND.name} — tu tienda online, lista para vender.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function ActionEmail({
  preview,
  siteUrl,
  heading,
  body,
  actionUrl,
  actionLabel,
  footerNote,
}: {
  preview: string
  siteUrl: string
  heading: string
  body: React.ReactNode
  actionUrl: string
  actionLabel: string
  footerNote?: string
}) {
  return (
    <BrandLayout preview={preview} siteUrl={siteUrl} footerNote={footerNote}>
      <Heading style={styles.h1}>{heading}</Heading>
      <Text style={styles.text}>{body}</Text>
      <Link href={actionUrl} style={styles.button}>
        {actionLabel}
      </Link>
      <Text style={{ ...styles.text, margin: '24px 0 0', fontSize: '13px' }}>
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br />
        <Link href={actionUrl} style={styles.hintLink}>
          {actionUrl}
        </Link>
      </Text>
    </BrandLayout>
  )
}
