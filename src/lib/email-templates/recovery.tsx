import * as React from 'react'

import { ActionEmail } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteUrl, confirmationUrl }: RecoveryEmailProps) => (
  <ActionEmail
    preview="Restablece tu contraseña"
    siteUrl={siteUrl}
    heading="Restablece tu contraseña"
    body={
      <>
        Recibimos una solicitud para cambiar tu contraseña. Haz clic en el botón para crear una
        nueva. El enlace caduca en poco tiempo por seguridad.
      </>
    }
    actionUrl={confirmationUrl}
    actionLabel="Crear nueva contraseña"
    footerNote="Si no solicitaste el cambio, ignora este correo: tu contraseña seguirá igual."
  />
)

export default RecoveryEmail
