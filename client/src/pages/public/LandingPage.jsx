import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>State Side Global — Only the Authentic. Only the Exceptional.</title>
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary/60 to-bg-primary" />
        <div className="container-luxe relative z-10 py-24">
          <p className="text-xs uppercase tracking-luxe text-gold mb-6">
            By invitation only
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-tight max-w-4xl">
            Only the Authentic.<br />
            <span className="text-gold">Only the Exceptional.</span>
          </h1>
          <p className="mt-8 max-w-xl text-text-secondary leading-relaxed">
            A members-only destination for authenticated luxury. Curated pieces from the world's
            most coveted houses — verified by experts, reserved for the discerning few.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/auth/register" className="btn-gold">Become a member</Link>
            <Link to="/auth/login" className="btn-ghost">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Teased grid */}
      <section className="container-luxe py-24">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-luxe text-text-muted">The Collection</p>
          <h2 className="font-display text-3xl md:text-4xl mt-2">Reserved for members</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 relative">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-bg-secondary border border-border relative overflow-hidden"
            >
              <div className="absolute inset-0 backdrop-blur-sm bg-gradient-to-br from-bg-tertiary to-bg-secondary" />
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="text-gold text-3xl mb-3">◆</div>
              <p className="text-xs uppercase tracking-luxe text-text-secondary mb-4">
                Members only
              </p>
              <Link to="/auth/register" className="btn-gold">Unlock the collection</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pitch */}
      <section className="container-luxe py-24 grid md:grid-cols-3 gap-12">
        {[
          { t: 'Authenticated', d: 'Every piece verified by certified luxury experts before listing.' },
          { t: 'Curated', d: 'A tightly edited selection — never volume, always quality.' },
          { t: 'Exclusive', d: 'Reserved for members. Access opens at ₦20,000 a month.' },
        ].map((p) => (
          <div key={p.t} className="border-t border-gold/30 pt-8">
            <h3 className="font-display text-2xl">{p.t}</h3>
            <p className="mt-3 text-text-secondary leading-relaxed">{p.d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
