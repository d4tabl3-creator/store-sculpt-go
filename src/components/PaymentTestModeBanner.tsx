const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive-soft px-4 py-2 text-center text-sm text-destructive">
        Los pagos aún no están activos en modo real. Completa el proceso de go-live para cobrar dinero real.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning-soft px-4 py-2 text-center text-sm text-warning">
        Pagos en modo de prueba — usa la tarjeta <code className="font-mono">4242 4242 4242 4242</code> para simular un cobro.
      </div>
    );
  }
  return null;
}
