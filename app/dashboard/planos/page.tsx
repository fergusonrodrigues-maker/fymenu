'use client';

import { useState, useEffect, useRef } from 'react';

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

type Billing = 'anual' | 'trimestral' | 'mensal';

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AnimatedPrice({ price }: { price: string }) {
  const [display, setDisplay] = useState(price);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    setFade(true);
    const t = setTimeout(() => {
      setDisplay(price);
      setFade(false);
    }, 150);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <span
      className="text-6xl font-black tracking-tighter"
      style={{ transition: 'opacity 0.15s, transform 0.15s', opacity: fade ? 0 : 1, transform: fade ? 'translateY(8px)' : 'translateY(0)' }}
    >
      {display}
    </span>
  );
}

function BorderBeam({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = 'fy-beam-keyframes';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `@keyframes fy-beam-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', inset: 0, borderRadius: 50, pointerEvents: 'none',
        background: `conic-gradient(from 0deg, transparent 0%, ${color} 8%, transparent 16%)`,
        animation: 'fy-beam-spin 3s linear infinite',
      }}
    />
  );
}

export default function PlanosPage() {
  const [billing, setBilling] = useState<Billing>('anual');

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>

      {/* Seletor de faturamento */}
      <div style={{ display: 'flex', background: '#111', padding: 4, borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
        {(['anual', 'trimestral', 'mensal'] as Billing[]).map((type) => (
          <button
            key={type}
            onClick={() => setBilling(type)}
            style={{
              padding: '8px 24px', borderRadius: 999, fontSize: 14, fontWeight: 500,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: billing === type ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: billing === type ? '#fff' : 'rgba(255,255,255,0.45)',
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32 }}>
        {PLANS.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} billing={billing} enterDelay={i * 200} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, billing, enterDelay }: { plan: typeof PLANS[0]; billing: Billing; enterDelay: number }) {
  const [hov, setHov] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), enterDelay);
    return () => clearTimeout(t);
  }, [enterDelay]);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', padding: 6, borderRadius: 50, width: 350,
        overflow: 'hidden', background: plan.color,
        transform: visible ? (hov ? 'translateY(-10px)' : 'translateY(0)') : 'translateY(30px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease, transform 0.3s ease',
      }}
    >
      {/* Badge */}
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, padding: '4px 16px', borderRadius: 999,
          fontSize: 11, fontWeight: 700, color: '#000', letterSpacing: 1.5, textTransform: 'uppercase',
          backgroundColor: plan.buttonColor,
        }}>
          Mais popular
        </div>
      )}

      {/* Border beam */}
      {plan.popular && <BorderBeam color={plan.buttonColor} />}

      {/* Inner card */}
      <div style={{
        position: 'relative', zIndex: 10, background: '#1a1a1a',
        borderRadius: 44, padding: '40px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', overflow: 'hidden', minHeight: 480,
      }}>
        <div>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 32, letterSpacing: -1 }}>
            {plan.name}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plan.features.map((feature, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 300, opacity: 0.9 }}>
                <CheckIcon color={plan.buttonColor} />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 32 }}>
            <span style={{ fontSize: 20, fontWeight: 300 }}>R$</span>
            <AnimatedPrice price={plan.prices[billing]} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>/mês</span>
          </div>

          <button
            onClick={() => {
              const msg = encodeURIComponent(`Olá! Quero fazer upgrade para o Plano ${plan.name} (${plan.prices[billing]}/mês - ${billing}). Pode me ajudar?`);
              window.open(`https://wa.me/5562994974355?text=${msg}`, '_blank');
            }}
            style={{
              width: '100%', padding: '16px', borderRadius: 999, border: 'none', cursor: 'pointer',
              backgroundColor: plan.buttonColor, color: '#000', fontWeight: 900,
              fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase',
              transition: 'filter 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            Fazer Upgrade
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 128, background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
