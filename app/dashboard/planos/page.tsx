'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check } from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    name: 'basic',
    color: 'linear-gradient(92deg, #b14764 -25%, #cd665e 125%)',
    buttonColor: '#a855f7',
    popular: false,
    features: [
      '1 Unidade',
      'Link/u/slug',
      'WhatsApp integrado',
      'QR Code',
      'Analytics básico',
    ],
    prices: { anual: '59', trimestral: '89', mensal: '119' },
  },
  {
    id: 'pro',
    name: 'Pro',
    color: 'linear-gradient(92deg, #00ffa3 -25%, #00d1ff 125%)',
    buttonColor: '#00ffa3',
    popular: true,
    features: [
      'Unidades ilimitadas',
      'Link/u/slug',
      'WhatsApp integrado',
      'QR Code',
      'Analytics avançado',
      'Domínio próprio',
      'Suporte prioritário',
    ],
    prices: { anual: '89', trimestral: '129', mensal: '159' },
  },
];

/**
 * Border-beam: conic-gradient rotacionando atrás do inner card.
 * Fica visível apenas na faixa de 6px de padding do card externo.
 */
function BorderBeam({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-[50px] pointer-events-none"
      style={{
        background: `conic-gradient(from 0deg, transparent 0%, ${color} 8%, transparent 16%)`,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  );
}

type Billing = 'anual' | 'trimestral' | 'mensal';

export default function PlanosPage() {
  const [billing, setBilling] = useState<Billing>('anual');

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center gap-12">

      {/* Seletor de faturamento */}
      <div className="flex bg-zinc-900 p-1 rounded-full border border-zinc-800">
        {(['anual', 'trimestral', 'mensal'] as Billing[]).map((type) => (
          <button
            key={type}
            onClick={() => setBilling(type)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billing === type ? 'bg-zinc-700 text-white' : 'text-zinc-500'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
        className="flex flex-wrap justify-center gap-8"
      >
        {PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -10, transition: { duration: 0.3 } }}
            /* Outer wrapper: define a borda colorida via padding + background */
            className="relative p-[6px] rounded-[50px] w-[350px] overflow-hidden"
            style={{ background: plan.color }}
          >
            {/* Badge "Mais popular" */}
            {plan.popular && (
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-20
                           px-4 py-1 rounded-full text-xs font-bold text-black uppercase tracking-widest"
                style={{ backgroundColor: plan.buttonColor }}
              >
                Mais popular
              </div>
            )}

            {/* Border-beam rotacionando por baixo do inner card */}
            {plan.popular && <BorderBeam color={plan.buttonColor} />}

            {/* Inner card escuro — z-10 para ficar acima do beam */}
            <div className="relative z-10 bg-[#1a1a1a] h-full w-full rounded-[44px] p-10 flex flex-col justify-between overflow-hidden">
              <div>
                <h2 className="text-4xl font-extrabold mb-8 tracking-tighter">
                  {plan.name}
                </h2>
                <ul className="space-y-4 mb-12">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-sm font-light opacity-90"
                    >
                      <Check size={16} style={{ color: plan.buttonColor }} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto">
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-xl font-light">R$</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={plan.prices[billing]}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-6xl font-black tracking-tighter"
                    >
                      {plan.prices[billing]}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-zinc-500 text-sm">/mês</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  style={{ backgroundColor: plan.buttonColor }}
                  className="w-full py-4 rounded-full text-black font-black text-lg uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  Fazer Upgrade
                </motion.button>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
