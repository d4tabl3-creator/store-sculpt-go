const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-red-300 bg-red-100 px-4 py-2 text-center text-sm text-red-800">
        Los pagos aún no están activos en modo real. Completa el proceso de go-live para cobrar dinero real.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-800">
        Pagos en modo de prueba — usa la tarjeta <code className="font-mono">4242 4242 4242 4242</code> para simular un cobro.
      </div>
    );
  }
  return null;
}
