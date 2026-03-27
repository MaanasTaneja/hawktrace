import { motion } from 'framer-motion';

const codeLines = [
  { text: "import { test, expect } from '@playwright/test';", color: 'text-white/30' },
  { text: '', color: '' },
  { text: "test('user can complete checkout', async ({ page }) => {", color: 'text-white/70' },
  { text: "  await page.goto('https://app.example.com');", color: 'text-white/40' },
  { text: '', color: '' },
  { text: "  // Login flow \u00b7 auto-generated from recording", color: 'text-white/20 italic' },
  { text: "  await page.getByRole('button', { name: 'Sign in' }).click();", color: 'text-[#E5622A]' },
  { text: "  await page.getByLabel('Email').fill('test@example.com');", color: 'text-[#E5622A]' },
  { text: "  await page.getByLabel('Password').fill('•••••••');", color: 'text-[#E5622A]' },
  { text: "  await page.getByRole('button', { name: 'Submit' }).click();", color: 'text-[#E5622A]' },
  { text: '', color: '' },
  { text: "  // Assertions \u00b7 HawkTrace inferred these from your session", color: 'text-white/20 italic' },
  { text: "  await expect(page).toHaveURL('/dashboard');", color: 'text-green-400/80' },
  { text: "  await expect(page.getByText('Welcome back')).toBeVisible();", color: 'text-green-400/80' },
  { text: '});', color: 'text-white/70' },
];

export function DarkShowcase() {
  return (
    <section id="how" className="bg-[#0E0E10] text-white py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E5622A]/[0.03] blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative">
        {/* Left . narrative */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[11px] font-mono text-[#E5622A] uppercase tracking-[0.2em] mb-6 block">
            What you get
          </span>
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.12] tracking-[-0.02em] text-white mb-6">
            Real Playwright tests.
            <br />
            <span className="text-white/30">Not screenshots. Not recordings.</span>
          </h2>
          <p className="text-white/40 text-[15px] leading-relaxed max-w-lg mb-8">
            Every session produces a clean, readable <code className="font-mono text-[#E5622A] text-[13px] bg-white/[0.04] px-1.5 py-0.5 rounded">.spec.ts</code> file
            that runs in your existing CI pipeline. Intent-aware selectors that survive refactors.
            Comments that explain what each step actually does.
          </p>

          <div className="flex items-center gap-6 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white/50">Auto-assertions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E5622A]" />
              <span className="text-white/50">Smart selectors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/50">CI-ready</span>
            </div>
          </div>
        </motion.div>

        {/* Right . code editor */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="bg-[#161618] rounded-xl border border-white/[0.06] overflow-hidden shadow-2xl">
            {/* Editor tabs */}
            <div className="flex items-center border-b border-white/[0.04] px-1">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b-2 border-[#E5622A] text-white/60 text-[11px] font-mono">
                checkout-flow.spec.ts
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2.5 text-white/20 text-[11px] font-mono">
                login.spec.ts
              </div>
            </div>

            {/* Code */}
            <div className="p-5 overflow-x-auto">
              {codeLines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-right mr-4 text-white/10 text-[11px] font-mono leading-6 select-none">
                    {i + 1}
                  </span>
                  <code className={`font-mono text-[12px] leading-6 ${line.color}`}>
                    {line.text}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Floating label */}
          <div className="absolute -top-3 -right-3 bg-[#E5622A] text-white text-[10px] font-mono font-medium px-3 py-1 rounded-full shadow-lg">
            auto-generated ✨
          </div>
        </motion.div>
      </div>
    </section>
  );
}
