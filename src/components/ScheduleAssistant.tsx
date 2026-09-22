import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getScheduleSuggestions,
  type ChatTurn,
  type ScheduleSuggestion,
} from "@/lib/ai-schedule.functions";
import { formatDateTime } from "@/lib/booking";

type DisplayMessage =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; suggestions: ScheduleSuggestion[] };

export function ScheduleAssistant({
  slug,
  onSelect,
}: {
  slug: string;
  onSelect: (suggestion: ScheduleSuggestion) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const history: ChatTurn[] = messages.map((m) =>
        m.kind === "user"
          ? { role: "user", content: m.text }
          : { role: "assistant", content: m.text },
      );
      return getScheduleSuggestions({ data: { slug, message, history } });
    },
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        { kind: "assistant", text: result.reply, suggestions: result.suggestions },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          kind: "assistant",
          text: "Something went wrong - please try again or use the form below.",
          suggestions: [],
        },
      ]);
    },
  });

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setMessages((prev) => [...prev, { kind: "user", text }]);
    setInput("");
    mutation.mutate(text);
  }

  return (
    <div className="mb-8 border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
        <Sparkles className="size-4" /> Ask for help finding a time
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us what you're after - e.g. "a gel manicure this weekend afternoon" - and we'll match
        it to a real open slot.
      </p>

      {messages.length > 0 && (
        <div className="mt-5 space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={message.kind === "user" ? "text-right" : "text-left"}>
              <p
                className={`inline-block max-w-[85%] rounded-sm px-3 py-2 text-sm ${
                  message.kind === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.text}
              </p>
              {message.kind === "assistant" && message.suggestions.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {message.suggestions.map((suggestion) => (
                    <Button
                      key={`${suggestion.serviceId}-${suggestion.staffId}-${suggestion.startIso}`}
                      type="button"
                      variant="editorial-outline"
                      className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left"
                      onClick={() => onSelect(suggestion)}
                    >
                      <span>
                        <span className="block text-sm font-medium">{suggestion.serviceName}</span>
                        <span className="mt-0.5 block text-xs opacity-70">
                          {suggestion.staffName} &middot; {formatDateTime(suggestion.startIso)}
                        </span>
                        <span className="mt-0.5 block text-xs opacity-70">
                          {suggestion.priceLabel} &middot; {suggestion.durationLabel}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {mutation.isPending && <p className="text-sm text-muted-foreground">Thinking…</p>}
        </div>
      )}

      <form onSubmit={send} className="mt-5 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What are you looking for?"
          className="h-11 rounded-sm bg-background"
          disabled={mutation.isPending}
        />
        <Button type="submit" disabled={mutation.isPending || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
