import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PricingProps {
  onBackToHow?: () => void;
}

export function Pricing({ onBackToHow }: PricingProps) {
  const tiers = [
    {
      name: 'STARTER',
      price: '$0',
      period: '/mo',
      features: [
        '5 recorded flows',
        'Runs on every deploy',
        'Basic assertions',
        'Community support'
      ],
      highlighted: false
    },
    {
      name: 'PRO',
      price: '$29',
      period: '/month',
      features: [
        'Unlimited flows',
        'Parallel runs',
        'Advanced assertions',
        'Custom selectors',
        'Slack alerts',
        'Priority support'
      ],
      highlighted: true,
      popular: true
    }
  ];

  return (
    <section id="pricing" className="py-32 px-6 bg-cream">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] font-mono font-medium tracking-[0.2em] text-burnt uppercase mb-4">PRICING</p>
          <h2 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-tight tracking-tight text-ink">
            Start free. Scale when ready.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative p-10 rounded-[28px] border overflow-hidden flex flex-col min-h-[580px] ${tier.highlighted
                  ? 'bg-ink text-cream border-stone shadow-2xl'
                  : 'bg-sand/30 border-sand text-ink'
                }`}
            >
              {tier.popular && (
                <div className="absolute top-6 right-6">
                  <span className="bg-burnt text-white text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                    POPULAR
                  </span>
                </div>
              )}

              <div className="flex-1">
                <p className={`text-[11px] font-mono font-bold tracking-wider mb-6 ${tier.highlighted ? 'text-dim' : 'text-dim'}`}>
                  {tier.name}
                </p>

                <div className="flex items-baseline gap-1 mb-10">
                  <span className="font-serif text-6xl font-semibold tracking-tight leading-none">{tier.price}</span>
                  <span className={`text-[15px] font-serif ${tier.highlighted ? 'text-dim' : 'text-dim'}`}>{tier.period}</span>
                </div>

                <ul className="space-y-5">
                  {tier.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-[15px] font-medium">
                      <Check className="w-4 h-4 text-burnt shrink-0" />
                      <span className={tier.highlighted ? 'text-dim' : 'text-mid'}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-10">
                <a
                  href="#how"
                  className="block w-full text-center bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] text-sm font-medium py-4 rounded-full hover:bg-[#E5622A]/20 transition-all hover:scale-[1.02]"
                >
                  Start recording
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}