export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary mt-32">
      <div className="container-luxe py-16 grid gap-12 md:grid-cols-4">
        <div>
          <div className="font-display tracking-luxe text-lg text-gold">STATE&nbsp;SIDE&nbsp;GLOBAL</div>
          <p className="mt-4 text-sm text-text-muted leading-relaxed">
            Only the Authentic.<br />Only the Exceptional.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-text-secondary mb-4">Discover</h4>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>About</li>
            <li>Authenticity</li>
            <li>Press</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-text-secondary mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>Contact</li>
            <li>FAQ</li>
            <li>Shipping</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-luxe text-text-secondary mb-4">The Inner Circle</h4>
          <p className="text-sm text-text-muted">
            Email capture form — Phase 7
          </p>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} State Side Global. All rights reserved.
      </div>
    </footer>
  );
}
