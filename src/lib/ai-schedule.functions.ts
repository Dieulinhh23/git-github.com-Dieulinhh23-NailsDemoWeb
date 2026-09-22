import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// The SDK's structured-output helper is built against the zod/v4 API surface
// (available as a compat submodule since zod 3.25) - the classic top-level
// `zod` import is a different ZodType hierarchy and fails to typecheck here.
import { z } from "zod/v4";

import { supabase } from "@/integrations/supabase/client";
import {
  buildSlots,
  formatDuration,
  formatPrice,
  type BusyBooking,
  type WorkingHour,
} from "@/lib/booking";

const DAYS_AHEAD = 14;
const MAX_SLOTS_PER_STAFF = 6;
const MAX_HISTORY_TURNS = 8;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ScheduleSuggestion = {
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startIso: string;
  endIso: string;
  priceLabel: string;
  durationLabel: string;
};

export type ScheduleAssistantResult = {
  reply: string;
  suggestions: ScheduleSuggestion[];
};

const AssistantReplySchema = z.object({
  reply: z.string().describe("A short, friendly reply to the client, plain text, no markdown."),
  suggestions: z
    .array(
      z.object({
        serviceId: z
          .string()
          .describe("Must be a serviceId that appears in the availability data."),
        staffId: z
          .string()
          .describe("Must be a staffId listed under that service in the availability data."),
        startIso: z
          .string()
          .describe("Must be one of the exact ISO timestamps listed for that service+staff pair."),
      }),
    )
    .max(4)
    .describe("Up to 4 concrete options. Empty if nothing in the data fits the request."),
});

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseInput(data: unknown): { slug: string; message: string; history: ChatTurn[] } {
  const body = data as { slug?: unknown; message?: unknown; history?: unknown };
  if (typeof body?.slug !== "string" || !body.slug) throw new Error("Missing salon slug");
  if (typeof body?.message !== "string" || !body.message.trim()) throw new Error("Missing message");
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (turn): turn is ChatTurn =>
            !!turn &&
            typeof turn === "object" &&
            (turn.role === "user" || turn.role === "assistant") &&
            typeof turn.content === "string",
        )
        .slice(-MAX_HISTORY_TURNS)
    : [];
  return { slug: body.slug, message: body.message.slice(0, 1000), history };
}

/** Grounds an AI scheduling assistant's replies in the salon's real services, staff and open slots. */
export const getScheduleSuggestions = createServerFn({ method: "POST" })
  .validator(parseInput)
  .handler(async ({ data }): Promise<ScheduleAssistantResult> => {
    const { slug, message, history } = data;

    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();
    if (salonError) throw new Error(salonError.message);
    if (!salon) throw new Error("Salon not found");

    const [servicesRes, staffRes, staffServicesRes, hoursRes] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("salon_id", salon.id)
        .eq("active", true)
        .order("name"),
      supabase.from("staff").select("*").eq("salon_id", salon.id).eq("active", true).order("name"),
      supabase.from("staff_services").select("*").eq("salon_id", salon.id),
      supabase.from("working_hours").select("*").eq("salon_id", salon.id),
    ]);
    if (servicesRes.error) throw new Error(servicesRes.error.message);
    if (staffRes.error) throw new Error(staffRes.error.message);
    if (staffServicesRes.error) throw new Error(staffServicesRes.error.message);
    if (hoursRes.error) throw new Error(hoursRes.error.message);

    const services = servicesRes.data ?? [];
    const staff = staffRes.data ?? [];
    const staffServices = staffServicesRes.data ?? [];
    const hours = (hoursRes.data ?? []) as WorkingHour[];

    if (services.length === 0 || staff.length === 0) {
      return {
        reply:
          "This salon hasn't published any services or team members yet, so I can't suggest a time.",
        suggestions: [],
      };
    }

    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(rangeStart.getTime() + DAYS_AHEAD * 86400000);

    const { data: busyRows, error: busyError } = await supabase
      .from("bookings")
      .select("staff_id, starts_at, ends_at")
      .eq("salon_id", salon.id)
      .neq("status", "cancelled")
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", rangeEnd.toISOString());
    if (busyError) throw new Error(busyError.message);
    const busy = (busyRows ?? []) as BusyBooking[];

    const dateKeys: string[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      dateKeys.push(toDateKey(new Date(rangeStart.getTime() + i * 86400000)));
    }

    // Ground truth: real open slots per service+staff, computed with the same
    // buildSlots logic the manual booking flow uses. The model may only choose
    // from this data - it never invents availability.
    type StaffAvailability = { staffId: string; staffName: string; openSlots: string[] };
    type ServiceAvailability = {
      serviceId: string;
      serviceName: string;
      description: string | null;
      priceLabel: string;
      durationLabel: string;
      durationMinutes: number;
      staff: StaffAvailability[];
    };

    const availability: ServiceAvailability[] = services.map((service) => {
      const eligibleStaff = staff.filter((member) =>
        staffServices.some((link) => link.service_id === service.id && link.staff_id === member.id),
      );
      const perStaff: StaffAvailability[] = eligibleStaff
        .map((member) => {
          const staffHours = hours.filter((h) => h.staff_id === member.id);
          const staffBusy = busy.filter((b) => b.staff_id === member.id);
          const openSlots: string[] = [];
          for (const dateKey of dateKeys) {
            if (openSlots.length >= MAX_SLOTS_PER_STAFF) break;
            const daySlots = buildSlots({
              date: dateKey,
              durationMinutes: service.duration_minutes,
              hours: staffHours,
              busy: staffBusy,
            });
            for (const slotStart of daySlots) {
              if (openSlots.length >= MAX_SLOTS_PER_STAFF) break;
              openSlots.push(slotStart.toISOString());
            }
          }
          return { staffId: member.id, staffName: member.name, openSlots };
        })
        .filter((s) => s.openSlots.length > 0);
      return {
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        priceLabel: formatPrice(service.price_cents),
        durationLabel: formatDuration(service.duration_minutes),
        durationMinutes: service.duration_minutes,
        staff: perStaff,
      };
    });

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      return {
        reply:
          "The scheduling assistant isn't configured yet. Please use the form below to book manually.",
        suggestions: [],
      };
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = [
      `You are the scheduling assistant embedded in ${salon.name}'s online booking page.`,
      "A client is describing what they want (a service, a mood, a day/time preference, a staff preference, etc.).",
      "Help them find a real service and a real open appointment time.",
      "",
      "Rules:",
      "- Only ever propose services, staff, and start times that appear in AVAILABILITY_DATA below. Never invent one.",
      "- If nothing in the data matches what they're asking for, say so plainly and suggest the closest real alternative, or ask one short clarifying question.",
      "- Keep the reply to 1-3 short sentences, warm and concrete (mention the service name and a day/time in words, e.g. 'Thursday at 2:00 PM').",
      "- suggestions is optional - leave it empty if you're only asking a clarifying question.",
      `- Current date/time: ${now.toISOString()}.`,
      "",
      `AVAILABILITY_DATA = ${JSON.stringify(availability)}`,
    ].join("\n");

    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2048,
      output_config: { effort: "medium", format: zodOutputFormat(AssistantReplySchema) },
      system: systemPrompt,
      messages: [
        ...history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user" as const, content: message },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        reply: "Sorry, I couldn't come up with a suggestion just now - please try the form below.",
        suggestions: [],
      };
    }

    // Re-validate against the ground-truth data rather than trusting the model's
    // echoed ids/timestamps verbatim.
    const suggestions: ScheduleSuggestion[] = [];
    for (const raw of parsed.suggestions) {
      const svc = availability.find((s) => s.serviceId === raw.serviceId);
      const member = svc?.staff.find((s) => s.staffId === raw.staffId);
      if (!svc || !member || !member.openSlots.includes(raw.startIso)) continue;
      const startsAt = new Date(raw.startIso);
      suggestions.push({
        serviceId: svc.serviceId,
        serviceName: svc.serviceName,
        staffId: member.staffId,
        staffName: member.staffName,
        startIso: raw.startIso,
        endIso: new Date(startsAt.getTime() + svc.durationMinutes * 60000).toISOString(),
        priceLabel: svc.priceLabel,
        durationLabel: svc.durationLabel,
      });
    }

    return { reply: parsed.reply, suggestions };
  });
