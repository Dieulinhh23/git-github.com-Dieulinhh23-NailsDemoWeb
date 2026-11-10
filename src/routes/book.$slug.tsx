import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScheduleAssistant } from "@/components/ScheduleAssistant";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleSuggestion } from "@/lib/ai-schedule.functions";
import {
  buildSlots,
  formatDuration,
  formatPrice,
  formatTime,
  toDateInputValue,
  type WorkingHour,
} from "@/lib/booking";

type Search = { embed?: boolean };

/** Sentinel staff choice meaning "whoever is free first". */
const ANY_STAFF = "any";
/** How many weeks ahead clients can page through in the date strip. */
const MAX_WEEKS_AHEAD = 8;
/** Menu sections appear in this order; any other category follows, then uncategorised services. */
const CATEGORY_ORDER = ["Manicures", "Pedicures", "Extensions", "Packages", "Add-ons & extras"];
const UNCATEGORISED = "Services";

type Slot = { time: Date; staffId: string };

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
  const [staffChoice, setStaffChoice] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Slot | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

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
      const [services, staff, staffServices, hours] = await Promise.all([
        supabase.from("services").select("*").eq("salon_id", salon.id).eq("active", true).order("name"),
        supabase.from("staff").select("*").eq("salon_id", salon.id).eq("active", true).order("name"),
        supabase.from("staff_services").select("staff_id, service_id").eq("salon_id", salon.id),
        supabase.from("working_hours").select("*").eq("salon_id", salon.id),
      ]);
      return {
        salon,
        services: services.data ?? [],
        staff: staff.data ?? [],
        staffServices: staffServices.data ?? [],
        hours: (hours.data ?? []) as WorkingHour[],
      };
    },
  });

  const service = data?.services.find((s) => s.id === serviceId) ?? null;

  const menu = useMemo(() => groupByCategory(data?.services ?? []), [data]);

  // Artists who offer the chosen service. A service nobody is linked to yet is open to everyone,
  // so salons that haven't set up artist skills keep working.
  const eligibleStaff = useMemo(() => {
    if (!data || !service) return [];
    return data.staff.filter((m) => offers(data.staffServices, m.id, service.id));
  }, [data, service]);

  // Staff whose calendars count for the current choice: one person, or every eligible artist for "any".
  const candidateStaffIds = useMemo(() => {
    if (!staffChoice) return [];
    return staffChoice === ANY_STAFF ? eligibleStaff.map((m) => m.id) : [staffChoice];
  }, [eligibleStaff, staffChoice]);

  const workingWeekdays = useMemo(() => {
    const days = new Set<number>();
    for (const h of data?.hours ?? []) {
      if (candidateStaffIds.includes(h.staff_id)) days.add(h.weekday);
    }
    return days;
  }, [data, candidateStaffIds]);

  const { data: busy = [] } = useQuery({
    queryKey: ["busy", data?.salon.id, date],
    enabled: !!data?.salon.id && !!staffChoice,
    queryFn: async () => {
      if (!data) return [];
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const { data: rows, error } = await supabase
        .from("bookings")
        .select("staff_id, starts_at, ends_at")
        .eq("salon_id", data.salon.id)
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString());
      if (error) throw error;
      return rows ?? [];
    },
  });

  const slots = useMemo<Slot[]>(() => {
    if (!service || !data) return [];
    // For "any artist", keep the first free artist at each start time.
    const byTime = new Map<number, Slot>();
    for (const id of candidateStaffIds) {
      const times = buildSlots({
        date,
        durationMinutes: service.duration_minutes,
        hours: data.hours.filter((h) => h.staff_id === id),
        busy: busy.filter((b) => b.staff_id === id),
      });
      for (const time of times) {
        if (!byTime.has(time.getTime())) byTime.set(time.getTime(), { time, staffId: id });
      }
    }
    return [...byTime.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [service, candidateStaffIds, date, data, busy]);

  function staffName(id: string) {
    return data?.staff.find((m) => m.id === id)?.name ?? "Your artist";
  }

  function pickDate(value: string) {
    setDate(value);
    setSlot(null);
  }

  /** Moves to the next day on which the chosen artist(s) work, keeping the strip in view. */
  function jumpToNextOpenDay() {
    const start = new Date(`${date}T00:00:00`);
    for (let i = 1; i <= MAX_WEEKS_AHEAD * 7; i++) {
      const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (workingWeekdays.has(next.getDay())) {
        pickDate(toDateInputValue(next));
        setWeekOffset(Math.min(MAX_WEEKS_AHEAD - 1, Math.floor(daysFromToday(next) / 7)));
        return;
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !service || !slot) return;
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      salon_id: data.salon.id,
      service_id: service.id,
      staff_id: slot.staffId,
      customer_user_id: null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      notes: customer.notes,
      starts_at: slot.time.toISOString(),
      ends_at: new Date(slot.time.getTime() + service.duration_minutes * 60000).toISOString(),
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      // Keep the client's details; only the time needs choosing again.
      toast.error("That time was just taken. Please choose another — your details are saved.");
      setSlot(null);
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
            {data.salon.name} will confirm your {service?.name ?? "appointment"} with {staffName(done.staffId)} on{" "}
            {done.time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} at{" "}
            {formatTime(done.time)}. A confirmation goes to {customer.email}.
          </p>
        </div>
      </Shell>
    );
  }

  const currentStep = slot ? 4 : staffChoice ? 3 : service ? 2 : 1;

  function applySuggestion(suggestion: ScheduleSuggestion) {
    const startsAt = new Date(suggestion.startIso);
    setServiceId(suggestion.serviceId);
    setStaffChoice(suggestion.staffId);
    setDate(toDateInputValue(startsAt));
    setWeekOffset(Math.min(MAX_WEEKS_AHEAD - 1, Math.max(0, Math.floor(daysFromToday(startsAt) / 7))));
    setSlot({ time: startsAt, staffId: suggestion.staffId });
    setShowAssistant(false);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7 + i);
  });

  return (
    <Shell embed={embed} salon={data.salon}>
      <header className="mb-8 border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Step {currentStep} of 4
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
        {!slot && (
          <button
            type="button"
            onClick={() => setShowAssistant((v) => !v)}
            className="mt-5 inline-flex items-center gap-2 text-sm text-accent underline-offset-4 hover:underline"
          >
            <Sparkles className="size-4" />
            {showAssistant ? "Hide the booking assistant" : "Not sure what to pick? Ask our assistant"}
          </button>
        )}
      </header>

      {showAssistant && !slot && <ScheduleAssistant slug={slug} onSelect={applySuggestion} />}

      {service ? (
        <DoneStep
          number={1}
          label="Service"
          value={`${service.name} · ${formatDuration(service.duration_minutes)} · ${formatPrice(service.price_cents)}`}
          onChange={() => {
            setServiceId(null);
            setSlot(null);
          }}
        />
      ) : (
        <Step number={1} title="Choose a service">
          {data.services.length === 0 && (
            <p className="text-sm text-muted-foreground">No services available yet.</p>
          )}
          {menu.length > 1 && (
            <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
              {[null, ...menu.map(([name]) => name)].map((name) => (
                <button
                  key={name ?? "all"}
                  type="button"
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    category === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary"
                  }`}
                >
                  {name ?? "All"}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-8">
            {menu
              .filter(([name]) => category === null || name === category)
              .map(([name, items]) => (
                <div key={name}>
                  {menu.length > 1 && <h3 className="mb-3 font-display text-2xl">{name}</h3>}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setServiceId(item.id);
                          setSlot(null);
                          // The previous artist may not offer this service.
                          setStaffChoice((current) =>
                            current && current !== ANY_STAFF && !offers(data.staffServices, current, item.id)
                              ? null
                              : current,
                          );
                        }}
                        className="group h-auto min-h-20 w-full justify-between whitespace-normal rounded-md border border-border bg-card p-4 text-left shadow-none transition-all hover:border-primary hover:bg-muted/50 sm:p-5"
                      >
                        <span className="min-w-0 pr-4">
                          <span className="block font-display text-xl font-normal text-foreground">{item.name}</span>
                          {item.description && (
                            <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">{item.description}</span>
                          )}
                        </span>
                        <span className="shrink-0">
                          <span className="block text-right text-base text-foreground">{formatPrice(item.price_cents)}</span>
                          <span className="mt-1 block text-right text-xs font-normal uppercase tracking-widest text-muted-foreground">{formatDuration(item.duration_minutes)}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Step>
      )}

      {service &&
        (staffChoice ? (
          <DoneStep
            number={2}
            label="Artist"
            value={staffChoice === ANY_STAFF ? "First available artist" : staffName(staffChoice)}
            onChange={() => {
              setStaffChoice(null);
              setSlot(null);
            }}
          />
        ) : (
          <Step number={2} title="Choose a team member">
            <div className="grid gap-3 sm:grid-cols-2">
              {eligibleStaff.length === 0 && (
                <p className="text-sm text-muted-foreground">No team members offer this service yet.</p>
              )}
              {eligibleStaff.length > 1 && (
                <Button
                  type="button"
                  variant="editorial-outline"
                  className="h-auto min-h-16 justify-start gap-3 px-5 py-4 text-left sm:col-span-2"
                  onClick={() => {
                    setStaffChoice(ANY_STAFF);
                    setSlot(null);
                  }}
                >
                  <Users className="size-5 shrink-0" />
                  <span>
                    <span className="block font-display text-lg normal-case tracking-normal">No preference</span>
                    <span className="mt-1 block text-xs font-normal normal-case tracking-normal opacity-70">
                      See the most times — we'll match you with whoever is free
                    </span>
                  </span>
                </Button>
              )}
              {eligibleStaff.map((member) => (
                <Button
                  key={member.id}
                  type="button"
                  variant="editorial-outline"
                  className="h-auto min-h-16 justify-start px-5 py-4 text-left"
                  onClick={() => {
                    setStaffChoice(member.id);
                    setSlot(null);
                  }}
                >
                  <span><span className="block font-display text-lg normal-case tracking-normal">{member.name}</span><span className="mt-1 block text-xs font-normal normal-case tracking-normal opacity-70">{member.title || "Nail artist"}</span></span>
                </Button>
              ))}
            </div>
          </Step>
        ))}

      {service &&
        staffChoice &&
        (slot ? (
          <DoneStep
            number={3}
            label="Time"
            value={`${slot.time.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} at ${formatTime(slot.time)}${staffChoice === ANY_STAFF ? ` with ${staffName(slot.staffId)}` : ""}`}
            onChange={() => setSlot(null)}
          />
        ) : (
          <Step number={3} title="Pick a day and time">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {weekDays[0]!.toLocaleDateString([], { month: "long", year: "numeric" })}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Previous week"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset((w) => w - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Next week"
                  disabled={weekOffset >= MAX_WEEKS_AHEAD - 1}
                  onClick={() => setWeekOffset((w) => w + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Choose a day">
              {weekDays.map((day) => {
                const value = toDateInputValue(day);
                const selected = value === date;
                const closed = !workingWeekdays.has(day.getDay());
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={closed}
                    aria-pressed={selected}
                    aria-label={day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) + (closed ? " — closed" : "")}
                    onClick={() => pickDate(value)}
                    className={`flex flex-col items-center rounded-md border py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <span className="text-[0.65rem] uppercase tracking-widest opacity-75">
                      {day.toLocaleDateString([], { weekday: "short" })}
                    </span>
                    <span className="mt-0.5 font-display text-lg leading-none sm:text-xl">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              {slots.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-5 text-sm">
                  <p className="text-muted-foreground">
                    {workingWeekdays.has(new Date(`${date}T00:00:00`).getDay())
                      ? "Fully booked on this day."
                      : "We're closed on this day."}
                  </p>
                  {workingWeekdays.size > 0 && (
                    <Button type="button" variant="link" className="mt-1 h-auto px-0" onClick={jumpToNextOpenDay}>
                      Show the next open day →
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {groupByPartOfDay(slots).map(([part, items]) => (
                    <div key={part}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{part}</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {items.map((item) => (
                          <Button
                            key={item.time.toISOString()}
                            type="button"
                            size="sm"
                            variant="editorial-outline"
                            className="h-11 normal-case tracking-normal"
                            onClick={() => setSlot(item)}
                          >
                            {formatTime(item.time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Times shown in your local time.
                  </p>
                </div>
              )}
            </div>
          </Step>
        ))}

      {slot && service && (
        <Step number={4} title="Your details">
          <form onSubmit={submit} className="max-w-xl space-y-5">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                autoComplete="name"
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
                autoComplete="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="c-phone"
                type="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-notes">
                Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
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
              {submitting
                ? "Sending…"
                : `Request ${slot.time.toLocaleDateString([], { weekday: "short" })} ${formatTime(slot.time)}`}
            </Button>
          </form>
        </Step>
      )}
    </Shell>
  );
}

function daysFromToday(day: Date) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

/** Whether an artist offers a service; services nobody is linked to are open to everyone. */
function offers(links: { staff_id: string; service_id: string }[], staffId: string, serviceId: string) {
  const forService = links.filter((l) => l.service_id === serviceId);
  return forService.length === 0 || forService.some((l) => l.staff_id === staffId);
}

function groupByCategory<T extends { category: string | null }>(services: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of services) {
    const name = item.category?.trim() || UNCATEGORISED;
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  const rank = (name: string) => {
    const i = CATEGORY_ORDER.indexOf(name);
    return i >= 0 ? i : name === UNCATEGORISED ? CATEGORY_ORDER.length + 1 : CATEGORY_ORDER.length;
  };
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

function groupByPartOfDay(slots: Slot[]): [string, Slot[]][] {
  const groups: [string, Slot[]][] = [
    ["Morning", []],
    ["Afternoon", []],
    ["Evening", []],
  ];
  for (const item of slots) {
    const hour = item.time.getHours();
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2]![1].push(item);
  }
  return groups.filter(([, items]) => items.length > 0);
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

/** A finished step collapsed to one line, so clients can see and change earlier choices. */
function DoneStep({
  number,
  label,
  value,
  onChange,
}: {
  number: number;
  label: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <section className="flex items-center gap-3 border-b border-border py-4 first:pt-0">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-label={`Step ${number} done`}>
        <Check className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm">{value}</p>
      </div>
      <Button type="button" variant="link" className="h-auto shrink-0 px-0" onClick={onChange}>
        Change
      </Button>
    </section>
  );
}
