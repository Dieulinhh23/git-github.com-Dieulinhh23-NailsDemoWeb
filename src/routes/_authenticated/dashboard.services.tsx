import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration, formatPrice } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("45");
  const [duration, setDuration] = useState("45");

  const { data: services = [] } = useQuery({
    queryKey: ["services", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("salon_id", salonId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services", salonId] });

  const addService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({
        salon_id: salonId!,
        name,
        description,
        price_cents: Math.round(Number(price) * 100),
        duration_minutes: Number(duration),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      toast.success("Service added.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed.");
      invalidate();
    },
    onError: () => toast.error("This service has bookings, so it can't be deleted. Hide it instead."),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-3">
        <h1 className="font-display text-3xl">Services</h1>
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">Add your first service to start taking bookings.</p>
        )}
        {services.map((service) => (
          <article
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background p-5"
          >
            <div>
              <h2 className="font-medium">{service.name}</h2>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {formatPrice(service.price_cents)} · {formatDuration(service.duration_minutes)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-widest">
                Visible
                <Switch
                  checked={service.active}
                  onCheckedChange={(active) => toggleActive.mutate({ id: service.id, active })}
                />
              </Label>
              <Button
                size="icon"
                variant="editorial-outline"
                aria-label={`Delete ${service.name}`}
                onClick={() => removeService.mutate(service.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </section>

      <form
        className="h-fit space-y-4 rounded-lg border border-border bg-background p-6"
        onSubmit={(e) => {
          e.preventDefault();
          addService.mutate();
        }}
      >
        <h2 className="font-display text-2xl">New service</h2>
        <div className="space-y-2">
          <Label htmlFor="svc-name">Name</Label>
          <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-desc">Description</Label>
          <Textarea id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="svc-price">Price</Label>
            <Input
              id="svc-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-duration">Minutes</Label>
            <Input
              id="svc-duration"
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={addService.isPending}>
          Add service
        </Button>
      </form>
    </div>
  );
}
