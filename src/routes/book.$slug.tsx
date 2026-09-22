import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  buildSlots,
  formatDuration,
  formatPrice,
  formatTime,
  toDateInputValue,
  type WorkingHour,
} from "@/lib/booking";

type Search = { embed?: boolean };

export const Route = createFileRoute("/book/$slug")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search['embed'] === "1" || search['embed'] === true ? { embed: true } : {},
  head: () => ({
    meta: [
      { title: "Book an appointment" },
      { name: "description", content: "Choose a service, a team member and a time that suits you." },
      { property: "og:title", content: "Book an appointment" },
      {
        property: "og:description",
        content: "Choose a service, a team member and a time that suits you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { slug } = useParams({ from: "/book/$slug" });
  const { embed } = useSearch({ from: "/book/$slug" });

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [slot, setSlot] = useState<Date | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Date | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-salon", slug],
    queryFn: async () => {
      const { data: salon, error } = await supabase
        .from("salons")
        .select("id, name, slug, tagline, address, phone")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!salon) return null;
      const [services, staff, hours] = await Promise.all([
        supabase.from("services").select("*").eq("salon_id", salon.id).eq("active", true).order("name"),
        supabase.from("staff").select("*").eq("salon_id", salon.id).eq("active", true).order("name"),
        supabase.from("working_hours").select("*").eq("salon_id", salon.id),
      ]);
      return {
        salon,
        services: services.data ?? [],
        staff: staff.data ?? [],
        hours: (hours.data ?? []) as WorkingHour[],
      };
    },
  });

  const service = data?.services.find((s) => s.id === serviceId) ?? null;

  const { data: busy = [] } = useQuery({
    queryKey: ["busy", data?.salon.id, staffId, date],
    enabled: !!data?.salon.id && !!staffId,
    queryFn: async () => {
      if (!data || !staffId) return [];
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("staff_id, starts_at, ends_at")
        .eq("salon_id", data.salon.id)
        .eq("staff_id", staffId)
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString());
      if (error) throw error;
      return rows ?? [];
    },
  });

  const slots = useMemo(() => {
    if (!service || !staffId || !data) return [];
    return buildSlots({
      date,
      durationMinutes: service.duration_minutes,
      hours: data.hours.filter((h) => h.staff_id === staffId),
      busy,
    });
  }, [service, staffId, date, data, busy]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !service || !slot) return;
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      salon_id: data.salon.id,
      service_id: service.id,
      staff_id: staffId,
      customer_user_id: null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      notes: customer.notes,
      starts_at: slot.toISOString(),
      ends_at: new Date(slot.getTime() + service.duration_minutes * 60000).toISOString(),
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("That time was just taken. Please choose another.");
      return;
    }
    setDone(slot);
  }

  if (isLoading) {
    return <Shell embed={embed}><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  }

  if (!data) {
    return (
      <Shell embed={embed}>
        <h1 className="font-display text-3xl">Booking page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This salon link is not active. Please check the address.
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell embed={embed} salon={data.salon}>
        <div className="flex min-h-96 flex-col items-start justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Check className="size-5" />
          </span>
          <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-accent">Appointment request</p>
          <h1 className="mt-3 font-display text-5xl leading-none">Request sent.</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
            {data.salon.name} will confirm your appointment on{" "}
            {done.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} at{" "}
            {formatTime(done)}. A confirmation goes to {customer.email}.
          </p>
        </div>
      </Shell>
    );
  }

  const currentStep = slot ? 4 : staffId ? 3 : service ? 2 : 1;

  return (
    <Shell embed={embed} salon={data.salon}>
      <header className="mb-10 border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Step {String(currentStep).padStart(2, "0")} of 04
        </p>
        <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">
          {currentStep === 1 && "Select your experience"}
          {currentStep === 2 && "Choose your artist"}
          {currentStep === 3 && "Find your time"}
          {currentStep === 4 && "Complete your request"}
        </h1>
        <div className="mt-7 grid grid-cols-4 gap-2" aria-label={`Step ${currentStep} of 4`}>
          {[1, 2, 3, 4].map((step) => (
            <span key={step} className={`h-1 ${step <= currentStep ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>
      </header>

      <Step number={1} title="Choose a service">
        <div className="space-y-3">
          {data.services.length === 0 && (
            <p className="text-sm text-muted-foreground">No services available yet.</p>
          )}
          {data.services.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => {
                setServiceId(item.id);
                setSlot(null);
              }}
              className={`group h-auto min-h-28 w-full justify-between whitespace-normal rounded-md border p-5 text-left shadow-none transition-all sm:p-6 ${
                serviceId === item.id ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary hover:bg-muted/50"
              }`}
            >
              <span className="min-w-0 pr-4">
                <span className="block font-display text-xl font-normal text-foreground sm:text-2xl">{item.name}</span>
                {item.description && (
                  <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">{item.description}</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-4">
                <span>
                  <span className="block text-right text-base text-foreground">{formatPrice(item.price_cents)}</span>
                  <span className="mt-1 block text-right text-xs font-normal uppercase tracking-widest text-muted-foreground">{formatDuration(item.duration_minutes)}</span>
                </span>
                <span className={`flex size-5 items-center justify-center rounded-full border ${serviceId === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {serviceId === item.id && <Check className="size-3" />}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </Step>

      {service && (
        <Step number={2} title="Choose a team member">
           <div className="grid gap-3 sm:grid-cols-2">
            {data.staff.length === 0 && (
              <p className="text-sm text-muted-foreground">No team members available yet.</p>
            )}
            {data.staff.map((member) => (
              <Button
                key={member.id}
                type="button"
                variant={staffId === member.id ? "default" : "editorial-outline"}
                className="h-auto min-h-16 justify-start px-5 py-4 text-left"
                onClick={() => {
                  setStaffId(member.id);
                  setSlot(null);
                }}
              >
                <span><span className="block font-display text-lg normal-case tracking-normal">{member.name}</span><span className="mt-1 block text-xs font-normal normal-case tracking-normal opacity-70">{member.title || "Nail artist"}</span></span>
              </Button>
            ))}
          </div>
        </Step>
      )}

      {service && staffId && (
        <Step number={3} title="Pick a time">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="booking-date" className="text-xs uppercase tracking-widest text-muted-foreground">Appointment date</Label>
            <Input
              id="booking-date"
              type="date"
              className="h-12 rounded-sm bg-card"
              value={date}
              min={toDateInputValue(new Date())}
              onChange={(e) => {
                setDate(e.target.value);
                setSlot(null);
              }}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No times available on this day. Try another date.
              </p>
            ) : (
              slots.map((time) => (
                <Button
                  key={time.toISOString()}
                  type="button"
                  size="sm"
                  variant={slot?.getTime() === time.getTime() ? "default" : "editorial-outline"}
                  className="h-11"
                  onClick={() => setSlot(time)}
                >
                  {formatTime(time)}
                </Button>
              ))
            )}
          </div>
        </Step>
      )}

      {slot && (
        <Step number={4} title="Your details">
          <form onSubmit={submit} className="max-w-xl space-y-5">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-notes">Anything we should know?</Label>
              <Textarea
                id="c-notes"
                value={customer.notes}
                onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-accent" /> Your details are used only for this appointment.
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
              Request {formatTime(slot)} appointment
            </Button>
          </form>
        </Step>
      )}
    </Shell>
  );
}

function Shell({ embed, salon, children }: { embed?: boolean | undefined; salon?: { name: string; tagline: string | null } | undefined; children: React.ReactNode }) {
  return (
    <main className={embed ? "min-h-screen bg-background p-4 sm:p-6" : "min-h-screen bg-muted px-4 py-8 sm:px-8 sm:py-14"}>
      <div className={`mx-auto grid max-w-5xl overflow-hidden border border-border bg-background shadow-xl ${embed ? "" : "lg:grid-cols-[19rem_1fr]"}`}>
        {!embed && salon && (
          <aside className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground sm:p-10 lg:min-h-[46rem]">
            <div>
              <a href="/" className="font-display text-4xl leading-none">Tom &amp; Jerry<br />Nails</a>
              <div className="my-7 h-px w-12 bg-secondary" />
              <p className="max-w-48 text-xs font-semibold uppercase leading-6 tracking-widest text-primary-foreground/70">
                Artistry &amp; precision in every detail
              </p>
            </div>
            <div className="relative mt-12">
              <Sparkles className="mb-4 size-5 text-secondary" />
              <p className="text-xs font-semibold uppercase tracking-widest">Premium nail care</p>
              <p className="mt-3 max-w-52 font-display text-lg italic leading-7 text-primary-foreground/70">
                Thoughtful service, beautiful results, and time reserved just for you.
              </p>
            </div>
          </aside>
        )}
        <div className="min-w-0 p-6 sm:p-10 lg:p-12">{children}</div>
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-7 first:pt-0 last:border-0">
      <h2 className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full border border-border text-[0.65rem]">{number}</span> {title}
      </h2>
      {children}
    </section>
  );
}
