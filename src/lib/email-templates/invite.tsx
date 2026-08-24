import * as React from 'react'

import { ActionEmail } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteUrl, confirmationUrl }: InviteEmailProps) => (
  <ActionEmail
    preview="Te invitaron a crear tu tienda"
    siteUrl={siteUrl}
    heading="Te invitaron a unirte"
    body="Acepta la invitación para activar tu cuenta y empezar a crear tu tienda online."
    actionUrl={confirmationUrl}
    actionLabel="Aceptar invitación"
  />
)

export default InviteEmail
