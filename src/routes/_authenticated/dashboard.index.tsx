import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function Overview() {
  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const { data: stats } = useQuery({
    queryKey: ["overview", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const [services, staff, upcoming] = await Promise.all([
        supabase.from("services").select("id", { count: "exact", head: true }).eq("salon_id", salonId!),
        supabase.from("staff").select("id", { count: "exact", head: true }).eq("salon_id", salonId!),
        supabase
          .from("bookings")
          .select("*, services(name)")
          .eq("salon_id", salonId!)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(5),
      ]);
      return {
        services: services.count ?? 0,
        staff: staff.count ?? 0,
        upcoming: upcoming.data ?? [],
      };
    },
  });

  const bookingUrl = origin && salon ? `${origin}/book/${salon.slug}` : "";
  const embedCode = bookingUrl
    ? `<iframe src="${bookingUrl}?embed=1" style="width:100%;height:760px;border:0" title="Book an appointment"></iframe>`
    : "";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Services" value={stats?.services ?? 0} />
        <Stat label="Team members" value={stats?.staff ?? 0} />
        <Stat label="Upcoming bookings" value={stats?.upcoming.length ?? 0} />
      </div>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="font-display text-2xl">Add booking to your website</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste this snippet into your own website and your booking page appears inside it, with
          your services, team and times.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-sm bg-secondary p-4 text-xs">{embedCode}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
              toast.success("Snippet copied.");
            }}
          >
            Copy snippet
          </Button>
          {salon && (
            <Button asChild size="sm" variant="editorial-outline">
              <a href={`/book/${salon.slug}`} target="_blank" rel="noreferrer">
                Preview booking page
              </a>
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Next appointments</h2>
          <Link to="/dashboard/bookings" className="text-xs font-semibold uppercase tracking-widest">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {stats?.upcoming.length ? (
            stats.upcoming.map((booking) => (
              <div key={booking.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-sm">
                <span className="font-medium">{booking.customer_name}</span>
                <span className="text-muted-foreground">
                  {(booking.services as { name: string } | null)?.name}
                </span>
                <span className="text-muted-foreground">{formatDateTime(booking.starts_at)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming bookings yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-4xl">{value}</p>
    </div>
  );
}
