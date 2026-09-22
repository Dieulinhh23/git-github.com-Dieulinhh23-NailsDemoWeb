import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", exact: true },
  { to: "/dashboard/services", label: "Services" },
  { to: "/dashboard/staff", label: "Team & hours" },
  { to: "/dashboard/bookings", label: "Bookings" },
  { to: "/dashboard/settings", label: "Settings" },
] as const;

function DashboardLayout() {
  const { data: salon, isLoading } = useMySalon();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/owner", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="font-display text-xl">
            ATELIER{" "}
            <span className="font-sans text-[0.55rem] font-semibold uppercase tracking-widest">
              Booking
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {salon && (
              <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">
                {salon.name}
              </span>
            )}
            <Button variant="editorial-outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <p className="mx-auto max-w-7xl px-5 py-16 text-sm text-muted-foreground sm:px-8">
          Loading…
        </p>
      ) : !salon ? (
        <CreateSalon />
      ) : (
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Outlet />
        </div>
      )}
    </div>
  );
}

function CreateSalon() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("salons").insert({
        owner_id: auth.user.id,
        name,
        slug: slug || slugify(name),
        tagline,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (error) throw error;
      toast.success("Your salon is ready.");
      await queryClient.invalidateQueries({ queryKey: ["my-salon"] });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("duplicate")
          ? "That web address is already taken. Try another."
          : error instanceof Error
            ? error.message
            : "Could not create the salon.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <h1 className="font-display text-4xl leading-none">Set up your salon</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This creates your own private space. Your services, team and bookings stay separate from
        every other salon on the platform.
      </p>
      <form onSubmit={create} className="mt-8 space-y-4 rounded-lg border border-border bg-background p-6">
        <div className="space-y-2">
          <Label htmlFor="name">Salon name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Booking page address</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
          <p className="text-xs text-muted-foreground">/book/{slug || "your-salon"}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Short description</Label>
          <Textarea id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          Create salon
        </Button>
      </form>
    </div>
  );
}
