import Image from "next/image";
import Link from "next/link";

export function BrandStory() {
  return (
    <section className="bg-cream-deep/40">
      <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24 lg:py-28">
        <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] md:order-none">
          <Image
            src="/assets/brand-bag.jpeg"
            alt="Packaging The Dew Edit"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
            Nuestra historia
          </span>
          <h2 className="mt-3 font-display text-[2.2rem] leading-[1.1] text-ink md:text-[3rem]">
            Nourish your skin,
            <br />
            <span className="italic text-gold">celebrate your glow.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            En The Dew Edit creemos que menos es más. Elegimos ingredientes efectivos,
            empaques cuidados y fórmulas livianas que trabajan con tu piel, no contra ella.
            Cada producto está pensado para esos momentos del día en los que te mirás al
            espejo y te gusta lo que ves.
          </p>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Nacimos en Tucuman con una misión clara: que las rutinas de belleza sean
            un acto de cuidado, no de esconderse.
          </p>
          <div className="mt-8">
            <Link
              href="/sobre-nosotros"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 text-sm font-medium text-ink hover:border-ink/60"
            >
              Conocé más
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
