import * as React from 'react'

import { Heading, Text } from '@react-email/components'

import { BrandLayout, styles } from './_brand'
import { publicUrl } from "@/lib/public-url";

interface ReauthenticationEmailProps {
  siteUrl?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteUrl = publicUrl(),
  token,
}: ReauthenticationEmailProps) => (
  <BrandLayout preview="Tu código de verificación" siteUrl={siteUrl}>
    <Heading style={styles.h1}>Tu código de verificación</Heading>
    <Text style={styles.text}>
      Escribe este código para confirmar tu identidad. Caduca en unos minutos.
    </Text>
    <Text style={styles.code}>{token}</Text>
  </BrandLayout>
)

export default ReauthenticationEmail
