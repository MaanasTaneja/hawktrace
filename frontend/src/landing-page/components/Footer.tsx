export function Footer() {
  return (
    <footer className="bg-ink text-white/30 py-6 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono">
        <span className="font-serif text-white/50 text-sm not-italic">HawkTrace</span>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-white/60 transition-colors">Twitter</a>
          <a href="#" className="hover:text-white/60 transition-colors">GitHub</a>
          <span className="text-white/15">© 2026</span>
        </div>
      </div>
    </footer>
  );
}