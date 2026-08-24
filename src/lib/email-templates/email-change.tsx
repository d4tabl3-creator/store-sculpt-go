import * as React from 'react'

import { ActionEmail } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl: string
  oldEmail?: string
  newEmail?: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteUrl,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <ActionEmail
    preview="Confirma tu nuevo correo"
    siteUrl={siteUrl}
    heading="Confirma tu nuevo correo"
    body={
      <>
        Solicitaste cambiar tu correo{oldEmail ? <> de <strong>{oldEmail}</strong></> : null}
        {newEmail ? <> a <strong>{newEmail}</strong></> : null}. Confirma el cambio para seguir
        entrando a tu cuenta sin problemas.
      </>
    }
    actionUrl={confirmationUrl}
    actionLabel="Confirmar cambio"
  />
)

export default EmailChangeEmail
