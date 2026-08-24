import * as React from 'react'

import { ActionEmail } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <ActionEmail
    preview="Confirma tu correo y entra a tu tienda"
    siteUrl={siteUrl}
    heading="Confirma tu correo"
    body={
      <>
        ¡Gracias por crear tu cuenta! Confirma la dirección <strong>{recipient}</strong> para
        activar tu tienda y empezar a vender.
      </>
    }
    actionUrl={confirmationUrl}
    actionLabel="Confirmar mi correo"
    footerNote="Si no creaste esta cuenta, puedes ignorar este correo."
  />
)

export default SignupEmail
