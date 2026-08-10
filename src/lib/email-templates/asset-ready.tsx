import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  storeName?: string
  storeUrl?: string
  panelUrl?: string
  guideUrl?: string
  firstStep?: string
}

const Email = ({ name, storeName, storeUrl, panelUrl, guideUrl, firstStep }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu activo digital está listo. Este es tu primer paso.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Tu activo ya está listo</Heading>
        <Text style={p}>
          {name ? `Hola ${name}, ` : 'Hola, '}
          terminamos de preparar {storeName ? `“${storeName}”` : 'tu activo digital'}. Ya puedes entrar
          y empezar a operarlo.
        </Text>

        <Section style={card}>
          <Text style={label}>Tu primer paso</Text>
          <Text style={stepText}>{firstStep || 'Revisa tu activo y confirma tus productos.'}</Text>
        </Section>

        {panelUrl ? (
          <Button href={panelUrl} style={button}>
            Entrar a mi panel
          </Button>
        ) : null}

        <Text style={p}>
          {guideUrl ? (
            <>
              Dentro de tu panel encontrarás tu guía de acompañamiento paso a paso:{' '}
              <a href={guideUrl} style={link}>
                ver mi guía
              </a>
              .
            </>
          ) : (
            'Dentro de tu panel encontrarás tu guía de acompañamiento paso a paso.'
          )}
        </Text>

        {storeUrl ? (
          <Text style={p}>
            Este es el enlace de tu activo:{' '}
            <a href={storeUrl} style={link}>
              {storeUrl}
            </a>
          </Text>
        ) : null}

        <Hr style={hr} />
        <Text style={small}>
          No necesitas adivinar qué sigue: tu panel siempre te muestra tu paso actual.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Tu activo digital está listo',
  displayName: 'Activo listo (bienvenida)',
  previewData: {
    name: 'Camila',
    storeName: 'Mi tienda',
    storeUrl: 'https://ejemplo.com/t/mi-tienda',
    panelUrl: 'https://ejemplo.com/dashboard',
    guideUrl: 'https://ejemplo.com/guia/123',
    firstStep: 'Revisa tus productos',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = { fontSize: '26px', margin: '0 0 12px', color: '#141414' }
const p = { fontSize: '15px', lineHeight: '24px', color: '#3d3d3d' }
const card = {
  border: '1px solid #e6e6e6',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '18px 0',
}
const label = { fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#7a7a7a', margin: 0 }
const stepText = { fontSize: '17px', fontWeight: 700, color: '#141414', margin: '6px 0 0' }
const button = {
  backgroundColor: '#141414',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
}
const link = { color: '#141414', fontWeight: 700 }
const hr = { borderColor: '#ececec', margin: '24px 0 12px' }
const small = { fontSize: '12px', color: '#8a8a8a' }
