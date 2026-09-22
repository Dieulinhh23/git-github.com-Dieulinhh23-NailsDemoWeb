import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMySalon } from "@/hooks/useSalon";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/dashboard/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("salon_id", salonId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: hours = [] } = useQuery({
    queryKey: ["working-hours", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("working_hours")
        .select("*")
        .eq("salon_id", salonId!);
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["staff", salonId] });
    queryClient.invalidateQueries({ queryKey: ["working-hours", salonId] });
  };

  const addStaff = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("staff")
        .insert({ salon_id: salonId!, name, title });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setTitle("");
      toast.success("Team member added.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveHours = useMutation({
    mutationFn: async (input: {
      staffId: string;
      weekday: number;
      start: string;
      end: string;
      enabled: boolean;
    }) => {
      if (!input.enabled) {
        const { error } = await supabase
          .from("working_hours")
          .delete()
          .eq("staff_id", input.staffId)
          .eq("weekday", input.weekday);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("working_hours").upsert(
        {
          salon_id: salonId!,
          staff_id: input.staffId,
          weekday: input.weekday,
          start_time: input.start,
          end_time: input.end,
        },
        { onConflict: "staff_id,weekday" },
      );
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member removed.");
      refresh();
    },
    onError: () => toast.error("Could not remove this team member."),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-4">
        <h1 className="font-display text-3xl">Team & hours</h1>
        {staff.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add the people who take appointments, then set the days and times they work.
          </p>
        )}
        {staff.map((member) => (
          <article key={member.id} className="rounded-lg border border-border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">{member.name}</h2>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {member.title || "Stylist"}
                </p>
              </div>
              <Button
                size="icon"
                variant="editorial-outline"
                aria-label={`Remove ${member.name}`}
                onClick={() => removeStaff.mutate(member.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              {WEEKDAYS.map((day, weekday) => {
                const row = hours.find(
                  (h) => h.staff_id === member.id && h.weekday === weekday,
                );
                return (
                  <div key={day} className="flex flex-wrap items-center gap-3 text-sm">
                    <Switch
                      checked={!!row}
                      aria-label={`${member.name} works on ${day}`}
                      onCheckedChange={(enabled) =>
                        saveHours.mutate({
                          staffId: member.id,
                          weekday,
                          start: row?.start_time ?? "09:00",
                          end: row?.end_time ?? "17:00",
                          enabled,
                        })
                      }
                    />
                    <span className="w-24 text-muted-foreground">{day}</span>
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!row}
                      value={(row?.start_time ?? "09:00").slice(0, 5)}
                      onChange={(e) =>
                        saveHours.mutate({
                          staffId: member.id,
                          weekday,
                          start: e.target.value,
                          end: (row?.end_time ?? "17:00").slice(0, 5),
                          enabled: true,
                        })
                      }
                    />
                    <Input
                      type="time"
                      className="w-32"
                      disabled={!row}
                      value={(row?.end_time ?? "17:00").slice(0, 5)}
                      onChange={(e) =>
                        saveHours.mutate({
                          staffId: member.id,
                          weekday,
                          start: (row?.start_time ?? "09:00").slice(0, 5),
                          end: e.target.value,
                          enabled: true,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <form
        className="h-fit space-y-4 rounded-lg border border-border bg-background p-6"
        onSubmit={(e) => {
          e.preventDefault();
          addStaff.mutate();
        }}
      >
        <h2 className="font-display text-2xl">New team member</h2>
        <div className="space-y-2">
          <Label htmlFor="staff-name">Name</Label>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-title">Role</Label>
          <Input
            id="staff-title"
            placeholder="Senior stylist"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={addStaff.isPending}>
          Add team member
        </Button>
      </form>
    </div>
  );
}
