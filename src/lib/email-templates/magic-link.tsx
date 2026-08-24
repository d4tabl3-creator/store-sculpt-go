import * as React from 'react'

import { ActionEmail } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteUrl, confirmationUrl }: MagicLinkEmailProps) => (
  <ActionEmail
    preview="Tu enlace de acceso"
    siteUrl={siteUrl}
    heading="Entra a tu cuenta"
    body="Usa el siguiente botón para iniciar sesión. El enlace es de un solo uso y caduca pronto."
    actionUrl={confirmationUrl}
    actionLabel="Entrar a mi cuenta"
  />
)

export default MagicLinkEmail
