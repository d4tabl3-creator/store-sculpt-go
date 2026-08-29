import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

const AUTH_URL = "https://store-sculpt-go.lovable.app/auth";
const AUTH_DESC = "Entra o crea tu cuenta DªTªBLe para armar tu tienda online en 4 pasos.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — DªTªBLe" },
      { name: "description", content: AUTH_DESC },
      { property: "og:title", content: "Entrar — DªTªBLe" },
      { property: "og:description", content: AUTH_DESC },
      { property: "og:url", content: AUTH_URL },
      { name: "twitter:title", content: "Entrar — DªTªBLe" },
      { name: "twitter:description", content: AUTH_DESC },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: AUTH_URL }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">("signin");
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");
    if (isRecovery) {
      setMode("update");
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  function mensajeError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const m = raw.toLowerCase();
    if (m.includes("pwned") || m.includes("compromised") || m.includes("data breach"))
      return t(
        "Esa contraseña aparece en filtraciones públicas de internet, así que no es segura. Escribe una distinta: mínimo 8 caracteres, con mayúscula, minúscula, un número y un símbolo (ejemplo: Tienda#2026mx). Evita nombres, fechas o palabras comunes.",
        "That password appears in public internet data breaches, so it isn't safe. Choose a different one: at least 8 characters, with uppercase, lowercase, a number and a symbol (example: Store#2026us). Avoid names, dates or common words.",
      );
    if (m.includes("weak") || m.includes("password should") || m.includes("at least"))
      return t(
        "La contraseña es demasiado débil. Usa al menos 8 caracteres combinando mayúscula, minúscula, número y un símbolo (ejemplo: Tienda#2026mx).",
        "The password is too weak. Use at least 8 characters combining uppercase, lowercase, a number and a symbol (example: Store#2026us).",
      );
    if (m.includes("already registered") || m.includes("user already"))
      return t("Ese correo ya tiene cuenta. Inicia sesión con tu contraseña.", "That email already has an account. Sign in with your password.");
    if (m.includes("invalid login"))
      return t(
        "Correo o contraseña incorrectos. Si tu cuenta se creó con Google, aún no tiene contraseña: usa «¿Olvidaste tu contraseña?» para crear una y recuperar tu tienda.",
        "Incorrect email or password. If your account was created with Google it has no password yet: use \"Forgot your password?\" to set one and recover your store.",
      );

    if (m.includes("email not confirmed")) return t("Confirma tu correo con el enlace que te enviamos.", "Confirm your email with the link we sent you.");
    if (m.includes("rate limit")) return t("Demasiados intentos. Espera un minuto e inténtalo de nuevo.", "Too many attempts. Wait a minute and try again.");
    return raw || t("Ocurrió un error. Inténtalo de nuevo.", "Something went wrong. Please try again.");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast.success(
        t(
          "Te enviamos un correo con el enlace para restablecer tu contraseña.",
          "We sent you an email with the link to reset your password.",
        ),
      );
      setMode("signin");
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("Contraseña actualizada. Ya puedes entrar.", "Password updated. You can sign in now."));
      if (typeof window !== "undefined") window.history.replaceState({}, "", "/auth");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/crear`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/crear" });
        } else {
          toast.success(t("Cuenta creada. Revisa tu correo para confirmarla.", "Account created. Check your email to confirm it."));
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
      toast.error(mensajeError(err));
      if (mode === "signin" && raw.includes("invalid login")) setMode("reset");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
        <Link to="/" className="block text-center font-display text-2xl font-extrabold">
          D<span className="text-primary">ª</span>T<span className="text-primary">ª</span>BLe
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl font-bold">
          {mode === "signin"
            ? t("Entrar", "Sign in")
            : mode === "signup"
              ? t("Crear cuenta", "Create account")
              : mode === "update"
                ? t("Nueva contraseña", "New password")
                : t("Restablecer contraseña", "Reset password")}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin"
            ? t("Accede a tu panel de tiendas", "Access your store dashboard")
            : mode === "signup"
              ? t("Empieza tu tienda en 10 minutos", "Start your store in 10 minutes")
              : mode === "update"
                ? t("Escribe tu nueva contraseña para entrar", "Type your new password to sign in")
                : t("Te enviaremos un enlace a tu correo", "We'll send a link to your email")}
        </p>

        {mode === "update" ? (
          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-3">
            <div>
              <Label htmlFor="newPassword">{t("Nueva contraseña", "New password")}</Label>
              <PasswordInput
                id="newPassword"
                showLabel={t("Mostrar contraseña", "Show password")}
                hideLabel={t("Ocultar contraseña", "Hide password")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Mínimo 8 caracteres, con mayúscula, número y símbolo.", "At least 8 characters, with uppercase, number and symbol.")}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Guardando…", "Saving…") : t("Guardar y entrar", "Save and sign in")}
            </Button>
          </form>
        ) : (
        <form onSubmit={mode === "reset" ? handleReset : handleEmail} className="mt-6 space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">{t("Nombre", "Name")}</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "reset" && (
            <div>
              <Label htmlFor="password">{t("Contraseña", "Password")}</Label>
              <PasswordInput id="password" showLabel={t("Mostrar contraseña", "Show password")} hideLabel={t("Ocultar contraseña", "Hide password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Mínimo 8 caracteres. Evita palabras comunes (ej. usa Tienda#2026mx).", "At least 8 characters. Avoid common words (e.g. use Store#2026us).")}
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t("Cargando…", "Loading…")
              : mode === "signin"
                ? t("Entrar", "Sign in")
                : mode === "signup"
                  ? t("Crear cuenta", "Create account")
                  : t("Enviar enlace", "Send link")}
          </Button>
        </form>
        )}

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setMode("reset")}
            className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t("¿Olvidaste tu contraseña?", "Forgot your password?")}
          </button>
        )}

        {mode !== "update" && (
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? t("¿No tienes cuenta? Crear una", "Don't have an account? Create one")
            : t("¿Ya tienes cuenta? Entrar", "Already have an account? Sign in")}
        </button>
        )}

      </div>
    </div>
  );
}
