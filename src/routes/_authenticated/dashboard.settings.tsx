import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: salon } = useMySalon();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    address: "",
    phone: "",
    published: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!salon) return;
    setForm({
      name: salon.name,
      slug: salon.slug,
      tagline: salon.tagline ?? "",
      address: salon.address ?? "",
      phone: salon.phone ?? "",
      published: salon.published,
    });
  }, [salon]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!salon) return;
    setBusy(true);
    const { error } = await supabase.from("salons").update(form).eq("id", salon.id);
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "That booking page address is taken."
          : error.message,
      );
      return;
    }
    toast.success("Saved.");
    queryClient.invalidateQueries({ queryKey: ["my-salon"] });
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5 rounded-lg border border-border bg-background p-6">
      <h1 className="font-display text-3xl">Salon settings</h1>
      <div className="space-y-2">
        <Label htmlFor="s-name">Salon name</Label>
        <Input
          id="s-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-slug">Booking page address</Label>
        <Input
          id="s-slug"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
          required
        />
        <p className="text-xs text-muted-foreground">/book/{form.slug}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-tagline">Short description</Label>
        <Textarea
          id="s-tagline"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="s-address">Address</Label>
          <Input
            id="s-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-phone">Phone</Label>
          <Input
            id="s-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <Label className="flex items-center gap-3 text-sm">
        <Switch
          checked={form.published}
          onCheckedChange={(published) => setForm({ ...form, published })}
        />
        Booking page is live
      </Label>
      <Button type="submit" disabled={busy}>
        Save changes
      </Button>
    </form>
  );
}
