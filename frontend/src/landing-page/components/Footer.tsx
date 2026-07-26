import logo from '../../assets/HawkTrace-Logo.png';

interface FooterProps {
  onAbout: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <footer className="py-7 px-8 border-t border-stone/60 bg-[#F5F4F1]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4">
        {/* Left: Logo + name */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="HawkTrace" className="h-5 w-auto" />
          <span className="font-serif text-base font-semibold text-ink">
            HawkTrace
          </span>
        </div>

        {/* Center: Links */}
        <div className="flex items-center gap-7 text-[12px] font-sans text-mid">
          <button onClick={onAbout} className="hover:text-ink transition-colors duration-200">About</button>
        </div>

        {/* Right: Copyright */}
        <span className="font-mono text-[11px] text-dim">
          © 2026 HawkTrace
        </span>
      </div>
    </footer>
  );
}
