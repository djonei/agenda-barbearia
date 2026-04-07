export default function SiteFooter() {
  return (
    <footer
      className="px-4 py-6 mt-8 text-center flex flex-col items-center gap-3"
      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-gray)' }}
    >
      <a
        href="https://instagram.com/barbeariabrusquense"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs flex items-center justify-center gap-2 hover:opacity-80"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
        @barbeariabrusquense
      </a>

      <p className="text-xs flex items-center justify-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Rua Carlos Graf, 26 — Jardim Maluche
      </p>

      <a
        href="tel:+554733513050"
        className="text-xs flex items-center justify-center gap-2 hover:opacity-80"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        (47) 3351-3050
      </a>
    </footer>
  )
}
