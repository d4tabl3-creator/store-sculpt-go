import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setChecked(true);
      if (!s) navigate({ to: "/auth", search: { next: window.location.pathname } });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
      if (!data.session) navigate({ to: "/auth", search: { next: window.location.pathname } });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!checked || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            D<span className="text-primary">ª</span>T<span className="text-primary">ª</span>BLe
          </span>
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Preparando tu panel…</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
