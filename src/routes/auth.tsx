import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  function mensajeError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const m = raw.toLowerCase();
    if (m.includes("pwned") || m.includes("compromised") || m.includes("data breach"))
      return "Esa contraseña aparece en filtraciones públicas de internet, así que no es segura. Escribe una distinta: mínimo 8 caracteres, con mayúscula, minúscula, un número y un símbolo (ejemplo: Tienda#2026mx). Evita nombres, fechas o palabras comunes.";
    if (m.includes("weak") || m.includes("password should") || m.includes("at least"))
      return "La contraseña es demasiado débil. Usa al menos 8 caracteres combinando mayúscula, minúscula, número y un símbolo (ejemplo: Tienda#2026mx).";
    if (m.includes("already registered") || m.includes("user already"))
      return "Ese correo ya tiene cuenta. Inicia sesión con tu contraseña.";
    if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
    if (m.includes("email not confirmed")) return "Confirma tu correo con el enlace que te enviamos.";
    if (m.includes("rate limit")) return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
    return raw || "Ocurrió un error. Inténtalo de nuevo.";
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
          toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(mensajeError(err));
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
          {mode === "signin" ? "Entrar" : "Crear cuenta"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Accede a tu panel de tiendas" : "Empieza tu tienda en 10 minutos"}
        </p>

        <form onSubmit={handleEmail} className="mt-6 space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">Nombre</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {mode === "signup" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Mínimo 8 caracteres. Evita palabras comunes (ej. usa Tienda#2026mx).
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Cargando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Entrar"}
        </button>
      </div>
    </div>
  );
}
