import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, MapPin, Phone } from "lucide-react";

import studioImage from "@/assets/gold-studio.jpg";
import lookbookImage from "@/assets/gold-lookbook.jpg";
import tomAndJerryCutout from "@/assets/tom-and-jerry-cutout.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Visit | Tom & Jerry Nails" },
      { name: "description", content: "Visit Tom & Jerry Nails — hours, location and easy online booking. No account needed." },
      { property: "og:title", content: "Contact & Visit | Tom & Jerry Nails" },
      { property: "og:description", content: "Hours, location and easy online booking at Tom & Jerry Nails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const SLUG = "tom-and-jerry-nails";

const details = [
  { icon: MapPin, title: "Studio", lines: ["Address coming soon", "Follow us for our opening announcement"] },
  { icon: Clock3, title: "Hours", lines: ["Mon – Sat: 9 AM – 6 PM", "Sunday: 9 AM – 2 PM"] },
  { icon: Phone, title: "Booking", lines: ["Online, no account needed", "Confirmation as soon as we accept"] },
];

function Contact() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="leading-tight" aria-label="Tom and Jerry Nails home">
            <span className="block font-display text-2xl sm:text-3xl">Tom &amp; Jerry</span>
            <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-primary">Nails and Spa</span>
          </Link>
          <nav className="hidden items-center gap-9 text-[0.72rem] font-semibold uppercase tracking-[0.18em] md:flex" aria-label="Main navigation">
            <Link to="/" className="transition-colors hover:text-primary">Home</Link>
            <Link to="/contact" className="text-primary">Contact</Link>
          </nav>
          <Button asChild className="uppercase tracking-[0.18em]">
            <Link to="/book/$slug" params={{ slug: SLUG }}>Book now</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 size-[28rem] rounded-full bg-secondary/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-[24rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow">Contact &amp; visit</p>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] sm:text-7xl">
              We can't wait to <span className="italic text-primary">meet you</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Book online in a minute — no account needed — or stop by during opening hours.
              Walk-ins are welcome when a chair is free.
            </p>
            <Button asChild size="lg" className="mt-10 uppercase tracking-[0.18em]">
              <Link to="/book/$slug" params={{ slug: SLUG }}>Book appointment <ArrowRight /></Link>
            </Button>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute inset-0 -m-4 rounded-[50%] border border-primary/40" />
            <img
              src={studioImage}
              alt="Calm cream and gold nail studio interior"
              width={1408}
              height={1008}
              className="relative aspect-[5/6] w-full rounded-[50%] object-cover shadow-xl"
            />
            <img
              src={tomAndJerryCutout}
              alt="Tom and Jerry cartoon duo"
              loading="lazy"
              className="absolute -bottom-5 -left-5 w-36 drop-shadow-lg sm:w-44"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Visit us</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Everything you need to know</h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
            {details.map((item) => (
              <div key={item.title} className="border border-border bg-background p-8 text-center">
                <item.icon className="mx-auto size-6 text-primary" />
                <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
                {item.lines.map((line) => (
                  <p key={line} className="mt-2 text-sm leading-7 text-muted-foreground">{line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <img
            src={lookbookImage}
            alt="Nude, blush and gold chrome nail designs arranged with dried flowers"
            loading="lazy"
            width={1408}
            height={1008}
            className="w-full object-cover shadow-lg"
          />
          <div className="max-w-xl">
            <p className="eyebrow">Your next set</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Ready when you are</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Pick a service, choose your artist and time, and we'll take care of the rest.
              Soft nudes, warm chrome or something bold — every appointment starts with a chat about what you love.
            </p>
            <Button asChild size="lg" variant="editorial-outline" className="mt-9 uppercase tracking-[0.18em]">
              <Link to="/book/$slug" params={{ slug: SLUG }}>Book your visit <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-10 text-background sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-2xl">Tom &amp; Jerry <small className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-secondary">Nails and Spa</small></span>
          <p className="text-background/70">© 2026 Tom &amp; Jerry Nails and Spa</p>
          <Link to="/" className="uppercase tracking-[0.18em]">Back to home</Link>
        </div>
      </footer>
    </main>
  );
}
