export function Footer() {
  return (
    <footer className="py-7 px-8 border-t border-stone/60 bg-[#F5F4F1]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Lab name */}
        <span className="font-serif text-base font-semibold text-ink">
          XXXX Labs
        </span>

        {/* Center: Links */}
        <div className="flex items-center gap-7 text-[12px] font-sans text-mid">
          <a href="#" className="hover:text-ink transition-colors duration-200">Docs</a>
          <a href="#" className="hover:text-ink transition-colors duration-200">Blog</a>
          <a href="#" className="hover:text-ink transition-colors duration-200">About</a>
          <a href="#" className="hover:text-ink transition-colors duration-200">Privacy</a>
        </div>

        {/* Right: Copyright */}
        <span className="font-mono text-[11px] text-dim">
          © 2026 XXXX Labs
        </span>
      </div>
    </footer>
  );
}
