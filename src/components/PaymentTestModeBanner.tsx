import { useT } from "@/lib/i18n";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  const t = useT();
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive-soft px-4 py-2 text-center text-sm text-destructive">
        {t(
          "Los pagos aún no están activos en modo real. Completa el proceso de go-live para cobrar dinero real.",
          "Payments aren't live yet. Complete the go-live process to charge real money.",
        )}
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning-soft px-4 py-2 text-center text-sm text-warning">
        {t("Pagos en modo de prueba — usa la tarjeta ", "Payments in test mode — use the card ")}
        <code className="font-mono">4242 4242 4242 4242</code>
        {t(" para simular un cobro.", " to simulate a charge.")}
      </div>
    );
  }
  return null;
}
