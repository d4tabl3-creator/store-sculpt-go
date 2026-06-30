import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Entrar — DªTªBLe" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: next || "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: next || "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (r.error) {
      toast.error(r.error.message || "No se pudo iniciar sesión con Google");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-60px)] max-w-md place-items-center px-4 py-12">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-pop">
          <h1 className="font-display text-2xl font-extrabold">Bienvenido a DªTªBLe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu tienda online lista en 10 minutos.</p>

          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="mt-6 w-full">
            <svg className="mr-2 size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
            Continuar con Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o con email <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <TabsContent value="signup" className="space-y-3 m-0">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required={tab === "signup"} />
                </div>
              </TabsContent>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full shine-on-hover">
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {tab === "signin" ? "Entrar" : "Crear cuenta"}
              </Button>
            </form>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
