import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Salon = Tables<"salons">;

export function useMySalon() {
  return useQuery({
    queryKey: ["my-salon"],
    queryFn: async (): Promise<Salon | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
