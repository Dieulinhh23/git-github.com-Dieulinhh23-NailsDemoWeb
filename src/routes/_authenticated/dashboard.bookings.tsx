import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard/bookings")({
  component: BookingsPage,
});

const FILTERS = ["upcoming", "all"] as const;

function BookingsPage() {
  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("upcoming");

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", salonId, filter],
    enabled: !!salonId,
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("*, services(name), staff(name)")
        .eq("salon_id", salonId!)
        .order("starts_at");
      if (filter === "upcoming") query = query.gte("starts_at", new Date().toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated.");
      queryClient.invalidateQueries({ queryKey: ["bookings", salonId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Bookings</h1>
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={filter === option ? "default" : "editorial-outline"}
              onClick={() => setFilter(option)}
            >
              {option === "upcoming" ? "Upcoming" : "All"}
            </Button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        bookings.map((booking) => (
          <article
            key={booking.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-background p-5"
          >
            <div className="space-y-1 text-sm">
              <p className="font-medium">{booking.customer_name}</p>
              <p className="text-muted-foreground">
                {booking.customer_email}
                {booking.customer_phone ? ` · ${booking.customer_phone}` : ""}
              </p>
              <p className="text-muted-foreground">
                {(booking.services as { name: string } | null)?.name}
                {booking.staff ? ` with ${(booking.staff as { name: string }).name}` : ""}
              </p>
              {booking.notes && <p className="text-muted-foreground">“{booking.notes}”</p>}
            </div>
            <div className="space-y-2 text-right text-sm">
              <p>{formatDateTime(booking.starts_at)}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {booking.status}
              </p>
              <div className="flex justify-end gap-2">
                {booking.status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => setStatus.mutate({ id: booking.id, status: "confirmed" })}
                  >
                    Confirm
                  </Button>
                )}
                {booking.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="editorial-outline"
                    onClick={() => setStatus.mutate({ id: booking.id, status: "cancelled" })}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
