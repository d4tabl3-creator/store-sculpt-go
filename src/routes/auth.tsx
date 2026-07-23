import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si te lo pide.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error con Google");
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

        <Button variant="outline" className="mt-6 w-full" onClick={handleGoogle}>
          Continuar con Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> o con email <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
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
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
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
