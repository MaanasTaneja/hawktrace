export function Ticker() {
  const words = ['Vercel', 'Linear', 'Notion', 'Supabase', 'Resend', 'Clerk', 'Stripe', 'Figma'];
  const doubled = [...words, ...words];
  return (
    <div className="border-y border-stone overflow-hidden py-3.5 bg-sand/50">
      <div className="flex items-center gap-12 animate-scroll-x whitespace-nowrap" style={{ width: 'max-content' }}>
        {doubled.map((w, i) => (
          <span key={i} className="text-dim text-[12px] font-mono tracking-wider uppercase select-none">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
