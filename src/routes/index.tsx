import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, Heart, Leaf, MapPin, Phone, Sparkles, Star } from "lucide-react";

import heroImage from "@/assets/gold-hero-nails.jpg";
import lookbookImage from "@/assets/gold-lookbook.jpg";
import studioImage from "@/assets/gold-studio.jpg";
import tomAndJerryCutout from "@/assets/tom-and-jerry-cutout.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tom & Jerry Nails | Manicures, Gel, Pedicures & Nail Art" },
      { name: "description", content: "A calm, golden nail studio. Book manicures, gel, spa pedicures and custom nail art online at Tom & Jerry Nails." },
      { property: "og:title", content: "Tom & Jerry Nails | Where nails become wearable art" },
      { property: "og:description", content: "Organic-minded nail care, elegant finishes and easy online booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SLUG = "tom-and-jerry-nails";

const services = [
  { name: "Classic Manicure", price: "$25", time: "30 min", detail: "Shape, cuticle care, hand massage and your choice of polish." },
  { name: "Gel Manicure", price: "$40", time: "45 min", detail: "A meticulous gel application with lasting colour and high shine." },
  { name: "Spa Pedicure", price: "$45", time: "60 min", detail: "A restorative soak, detailed care, massage and flawless polish." },
  { name: "Nail Art Add-On", price: "$15", time: "30 min", detail: "Fine lines, chrome, French details or a custom design made for you." },
];

const benefits = [
  { icon: Sparkles, title: "Relaxing, luxurious atmosphere", text: "A quiet, golden space designed for slowing down." },
  { icon: Star, title: "Wide range of nail services", text: "Manicures, gel, pedicures and bespoke nail artistry." },
  { icon: Heart, title: "Affordable pricing, premium results", text: "Honest prices with unhurried, careful work every time." },
  { icon: Leaf, title: "Gentle, non-toxic options", text: "Kinder formulas and freshly prepared tools for every guest." },
];

function Index() {
  return (
    <main id="top" className="overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="leading-tight" aria-label="Tom and Jerry Nails home">
            <span className="block font-display text-2xl sm:text-3xl">Tom &amp; Jerry</span>
            <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-primary">Nails and Spa</span>
          </a>
          <nav className="hidden items-center gap-9 text-[0.72rem] font-semibold uppercase tracking-[0.18em] md:flex" aria-label="Main navigation">
            <a href="#services" className="transition-colors hover:text-primary">Services</a>
            <a href="#about" className="transition-colors hover:text-primary">About</a>
            <a href="#gallery" className="transition-colors hover:text-primary">Gallery</a>
            <Link to="/contact" className="transition-colors hover:text-primary">Contact</Link>
          </nav>
          <Button asChild className="uppercase tracking-[0.18em]">
            <Link to="/book/$slug" params={{ slug: SLUG }}>Book now</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden bg-background">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 size-[28rem] rounded-full bg-secondary/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-[24rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow">Tom &amp; Jerry Nails and Spa</p>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] sm:text-7xl">
              Where nails become <span className="italic text-primary">wearable art</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Step into a calm little sanctuary of creativity and care. We pair gentle, thoughtful nail care with
              meticulous artistry, so every set feels finished, lasting and entirely yours.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="uppercase tracking-[0.18em]">
                <Link to="/book/$slug" params={{ slug: SLUG }}>Book appointment <ArrowRight /></Link>
              </Button>
              <a href="#services" className="group inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
                View services <span className="h-px w-8 bg-primary transition-all group-hover:w-14" />
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute inset-0 -m-4 rounded-[50%] border border-primary/40" />
            <img
              src={heroImage}
              alt="Softly polished nude manicure resting on cream silk"
              width={1200}
              height={1408}
              className="relative aspect-[5/6] w-full rounded-[50%] object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:px-8">
          <span>Manicure</span><span>Gel polish</span><span>Pedicure</span><span>Nail art</span><span>Book online</span>
        </div>
      </section>

      <section id="services" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Services</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Curated experiences for every style</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              From quiet, minimalist elegance to bold, gallery-worthy designs — gentle formulas keep your nails as
              healthy as they are beautiful.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {services.map((service) => (
              <article key={service.name} className="flex flex-col justify-between gap-6 border border-border bg-card p-8 transition-shadow hover:shadow-lg">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-3xl">{service.name}</h3>
                    <span className="font-display text-2xl text-primary">{service.price}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{service.time}</p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{service.detail}</p>
                </div>
                <Button asChild variant="editorial-outline" className="self-start uppercase tracking-[0.18em]">
                  <Link to="/book/$slug" params={{ slug: SLUG }}>Book this <ArrowRight /></Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-border bg-card px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative mx-auto w-full max-w-lg">
            <img src={studioImage} alt="Calm cream and gold nail studio interior" loading="lazy" width={1408} height={1008} className="w-full object-cover shadow-lg" />
            <div className="absolute -bottom-8 -right-5 hidden w-44 sm:block">
              <img src={tomAndJerryCutout} alt="Tom and Jerry cartoon duo" loading="lazy" className="h-36 w-full object-contain drop-shadow-lg" />
            </div>
          </div>
          <div className="max-w-xl">
            <p className="eyebrow">About us</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Artistry meets a little mischief</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Tom &amp; Jerry Nails is a small, family-run studio built on care. Every detail — the prep, the shape,
              the final coat — is done slowly and properly, with gentle products we're happy to use on ourselves.
            </p>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Named for the timeless duo, our studio keeps a bright sense of fun alongside genuinely polished work.
              Bring an idea or a photo and we'll shape it into something that feels like you.
            </p>
            <Button asChild size="lg" className="mt-9 uppercase tracking-[0.18em]">
              <Link to="/book/$slug" params={{ slug: SLUG }}>Book your nail day <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Benefits</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Why you should choose us</h2>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div key={benefit.title} className="border-t border-primary/40 pt-6">
                <div className="flex items-center gap-3">
                  <benefit.icon className="size-5 text-primary" />
                  <span className="font-display text-2xl text-primary">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl leading-snug">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="border-y border-border bg-card px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <img src={lookbookImage} alt="Nude, blush and gold chrome nail designs arranged with dried flowers" loading="lazy" width={1408} height={1008} className="w-full object-cover shadow-lg" />
          <div className="max-w-xl">
            <p className="eyebrow">Gallery</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">From barely there to beautifully bold</h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Soft nudes, warm chrome, fine florals and clean French finishes. Bring a reference or start with a
              colour and we'll refine the shape and detail together.
            </p>
            <Button asChild size="lg" variant="editorial-outline" className="mt-9 uppercase tracking-[0.18em]">
              <Link to="/book/$slug" params={{ slug: SLUG }}>Create your set <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="visit" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Tom &amp; Jerry Nails and Spa</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Your dream nails are just a click away</h2>
            <Button asChild size="lg" className="mt-9 uppercase tracking-[0.18em]">
              <Link to="/book/$slug" params={{ slug: SLUG }}>Schedule appointment <ArrowRight /></Link>
            </Button>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 border-t border-border pt-10 sm:grid-cols-3">
            <div className="flex gap-4"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-7 text-muted-foreground">Studio<br /><span className="text-foreground">Address coming soon</span></p></div>
            <div className="flex gap-4"><Clock3 className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-7 text-muted-foreground">Hours<br /><span className="text-foreground">9 AM–6 PM · Sunday until 2 PM</span></p></div>
            <div className="flex gap-4"><Phone className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-7 text-muted-foreground">Booking<br /><span className="text-foreground">Online, no account needed</span></p></div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground px-5 py-10 text-background sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-2xl">Tom &amp; Jerry <small className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-secondary">Nails and Spa</small></span>
          <p className="text-background/70">© 2026 Tom &amp; Jerry Nails and Spa</p>
          <a href="#top" className="uppercase tracking-[0.18em]">Back to top</a>
        </div>
      </footer>
    </main>
  );
}
