import Link from "next/link";

const BRAND = "#00ffae";
const BRAND_DIM = "rgba(0,255,174,0.12)";
const BRAND_GLOW = "rgba(0,255,174,0.06)";

export default function LandingPage() {
  return (
    <div style={{ background: "#060606", color: "#fff", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", overflowX: "hidden" }}>

      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(6,6,6,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
            Fy<span style={{ color: BRAND }}>Menu</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", gap: 28, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              {[["Funcionalidades", "#features"], ["Como funciona", "#how"], ["Planos", "#pricing"]].map(([l, h]) => (
                <a key={h} href={h} className="nav-link">{l}</a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/entrar" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 16px" }}>
                Entrar
              </Link>
              <Link href="/cadastro" style={{
                fontSize: 14, fontWeight: 700, color: "#000", textDecoration: "none",
                background: BRAND, borderRadius: 8, padding: "8px 18px",
                transition: "opacity 0.2s",
              }}>
                Começar grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", minHeight: "92vh", display: "flex", alignItems: "center",
        padding: "80px 24px 60px",
        background: `radial-gradient(ellipse 70% 50% at 50% -5%, ${BRAND_GLOW} 0%, transparent 65%), #060606`,
      }}>
        {/* Linha decorativa de grade no fundo */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", position: "relative" }}>
          <div style={{ maxWidth: 740 }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              border: `1px solid ${BRAND_DIM}`, borderRadius: 100,
              padding: "6px 14px", marginBottom: 32,
              background: BRAND_DIM, fontSize: 13, fontWeight: 600, color: BRAND,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND, display: "inline-block", boxShadow: `0 0 8px ${BRAND}` }} />
              Gestão completa para restaurantes
            </div>

            <h1 style={{ fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
              Do pedido ao<br />
              <span style={{ color: BRAND }}>pagamento.</span><br />
              Tudo em um só lugar.
            </h1>

            <p style={{ fontSize: "clamp(17px, 2vw, 21px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 40px", maxWidth: 560 }}>
              Cardápio digital via QR Code, hub de pedidos em tempo real, PDV com PIX e muito mais. Para restaurantes que querem crescer com tecnologia.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/cadastro" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: BRAND, color: "#000", fontWeight: 800, fontSize: 16,
                padding: "14px 28px", borderRadius: 12, textDecoration: "none",
                boxShadow: `0 0 40px ${BRAND_DIM}`,
              }}>
                Começar 7 dias grátis →
              </Link>
              <a href="#how" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)",
                fontWeight: 600, fontSize: 16, padding: "14px 28px", borderRadius: 12,
                textDecoration: "none", background: "rgba(255,255,255,0.04)",
              }}>
                Ver como funciona
              </a>
            </div>

            <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              Sem cartão de crédito · Cancele quando quiser
            </p>
          </div>

          {/* Mock UI flutuante */}
          <div style={{
            position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)",
            width: 400, display: "flex", flexDirection: "column", gap: 12,
          }}
            className="hero-mock"
          >
            <MockKanban />
            <MockPDV />
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
            Tecnologia de ponta para restaurantes modernos
          </span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          {["Menu QR Code", "Realtime", "PDV integrado", "IA generativa"].map((t) => (
            <span key={t} style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.5px" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px" }}>
            Tudo que seu restaurante precisa
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, margin: 0 }}>
            Uma plataforma completa, do cardápio ao fechamento do caixa.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ─── COMO FUNCIONA ───────────────────────────────────────────────── */}
      <section id="how" style={{
        padding: "100px 24px",
        background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${BRAND_GLOW} 0%, transparent 60%), rgba(255,255,255,0.015)`,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px" }}>
              Simples de configurar.<br />Poderoso no dia a dia.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, margin: 0 }}>
              Seu restaurante online em menos de 10 minutos.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
            {/* linha conectando os steps */}
            <div style={{
              position: "absolute", top: 28, left: "calc(16.6% + 20px)", right: "calc(16.6% + 20px)",
              height: 1, background: `linear-gradient(90deg, ${BRAND_DIM}, ${BRAND_DIM})`,
              zIndex: 0,
            }} />
            {STEPS.map((s, i) => (
              <StepCard key={i} step={i + 1} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px" }}>
              Preço simples e transparente
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, margin: 0 }}>
              Comece grátis. Escale quando quiser.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            <PricingCard
              name="Basic"
              price="R$ —"
              period="/mês"
              description="Para quem está começando e quer digitalizar o cardápio."
              features={[
                "Cardápio digital ilimitado",
                "QR Code personalizado",
                "Modo TV / Display",
                "1 unidade",
                "Suporte por e-mail",
              ]}
              cta="Começar grátis"
              href="/cadastro"
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="R$ —"
              period="/mês"
              description="Para restaurantes que querem gestão completa do pedido ao pagamento."
              features={[
                "Tudo do Basic",
                "Hub Central (Kanban em tempo real)",
                "PDV integrado (Dinheiro / Cartão / PIX)",
                "App Garçom",
                "Relatórios e analytics",
                "IA para importação de cardápio",
                "Múltiplas unidades",
                "Suporte prioritário",
              ]}
              cta="Assinar Pro"
              href="/cadastro"
              highlighted={true}
            />
          </div>

          <p style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "rgba(255,255,255,0.25)" }}>
            7 dias grátis em todos os planos · Sem contrato de fidelidade · Cancele a qualquer momento
          </p>
        </div>
      </section>

      {/* ─── CTA FINAL ───────────────────────────────────────────────────── */}
      <section style={{
        padding: "100px 24px",
        background: `radial-gradient(ellipse 60% 80% at 50% 50%, ${BRAND_GLOW} 0%, transparent 70%)`,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, letterSpacing: "-2px", margin: "0 0 20px" }}>
            Pronto para modernizar<br />seu restaurante?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, margin: "0 0 40px" }}>
            Crie sua conta grátis e tenha seu cardápio digital no ar em minutos.
          </p>
          <Link href="/cadastro" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: BRAND, color: "#000", fontWeight: 800, fontSize: 18,
            padding: "16px 36px", borderRadius: 14, textDecoration: "none",
            boxShadow: `0 0 60px ${BRAND_DIM}`,
          }}>
            Criar minha conta grátis →
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontWeight: 900, fontSize: 18 }}>
            Fy<span style={{ color: BRAND }}>Menu</span>
          </span>
          <div style={{ display: "flex", gap: 28, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            <Link href="/entrar" style={{ color: "inherit", textDecoration: "none" }}>Entrar</Link>
            <Link href="/cadastro" style={{ color: "inherit", textDecoration: "none" }}>Cadastro</Link>
            <a href="mailto:contato@fymenu.com" style={{ color: "inherit", textDecoration: "none" }}>Contato</a>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} FyMenu · Todos os direitos reservados
          </span>
        </div>
      </footer>

      <style>{`
        .nav-link {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          transition: color 0.2s;
          font-size: 14px;
        }
        .nav-link:hover { color: #fff; }
        @media (max-width: 900px) {
          .hero-mock { display: none !important; }
        }
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Dados ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "📱",
    title: "Cardápio Digital via QR",
    desc: "Clientes acessam pelo celular, sem app. Fotos, vídeos, variações e observações personalizadas.",
    accent: "#00ffae",
  },
  {
    icon: "🍳",
    title: "Hub Central — Kanban",
    desc: "Pedidos em tempo real com 3 colunas: Novos, Em Preparo e Prontos. Com alertas sonoros e timer.",
    accent: "#facc15",
  },
  {
    icon: "💳",
    title: "PDV Integrado",
    desc: "Cobranças com Dinheiro, Cartão e PIX. Calculadora de troco automática e recibo digital.",
    accent: "#818cf8",
  },
  {
    icon: "🍽️",
    title: "App Garçom",
    desc: "O garçom vê, edita e confirma pedidos pelo tablet antes de enviar para a cozinha.",
    accent: "#f97316",
  },
  {
    icon: "📺",
    title: "TV / Display Mode",
    desc: "Exiba o cardápio em vídeo na área de espera do restaurante com modo paisagem ou retrato.",
    accent: "#22d3ee",
  },
  {
    icon: "🤖",
    title: "IA para Cardápio",
    desc: "Importe cardápios em texto e gere descrições, fotos e informações nutricionais automaticamente.",
    accent: "#a78bfa",
  },
];

const STEPS = [
  {
    icon: "✏️",
    title: "Crie seu cardápio",
    desc: "Cadastre produtos, preços e fotos. A IA pode te ajudar a preencher tudo em segundos.",
  },
  {
    icon: "📲",
    title: "Compartilhe o QR Code",
    desc: "Cole o código na mesa. Clientes acessam, escolhem e pedem direto pelo celular.",
  },
  {
    icon: "💸",
    title: "Gerencie e receba",
    desc: "Acompanhe pedidos no Hub Central e feche as contas no PDV com qualquer método.",
  },
];

// ─── Componentes ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, accent }: {
  icon: string; title: string; desc: string; accent: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "28px 24px",
      transition: "border-color 0.2s, background 0.2s",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, marginBottom: 16,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>
        {icon}
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 17, margin: "0 0 10px", letterSpacing: "-0.3px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  );
}

function StepCard({ step, icon, title, desc }: {
  step: number; icon: string; title: string; desc: string;
}) {
  return (
    <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
        background: "#060606", border: `2px solid ${BRAND}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, boxShadow: `0 0 24px ${BRAND_DIM}`,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: BRAND, letterSpacing: "2px", marginBottom: 8 }}>
        PASSO {step}
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 18, margin: "0 0 10px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, cta, href, highlighted }: {
  name: string; price: string; period: string; description: string;
  features: string[]; cta: string; href: string; highlighted: boolean;
}) {
  return (
    <div style={{
      border: highlighted ? `1.5px solid ${BRAND}` : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20, padding: "32px 28px",
      background: highlighted ? `rgba(0,255,174,0.04)` : "rgba(255,255,255,0.02)",
      position: "relative", overflow: "hidden",
    }}>
      {highlighted && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: BRAND, color: "#000", fontSize: 11, fontWeight: 800,
          padding: "4px 10px", borderRadius: 100, letterSpacing: "0.5px",
        }}>
          MAIS POPULAR
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", margin: "0 0 8px", textTransform: "uppercase" }}>{name}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
          <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-2px", color: highlighted ? BRAND : "#fff" }}>
            {price}
          </span>
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>{period}</span>
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>{description}</p>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: BRAND, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Link href={href} style={{
        display: "block", textAlign: "center", fontWeight: 700, fontSize: 15,
        padding: "13px", borderRadius: 10, textDecoration: "none",
        background: highlighted ? BRAND : "rgba(255,255,255,0.07)",
        color: highlighted ? "#000" : "#fff",
        border: highlighted ? "none" : "1px solid rgba(255,255,255,0.1)",
      }}>
        {cta}
      </Link>
    </div>
  );
}

// ─── Mock UI do Hero ──────────────────────────────────────────────────────────

function MockKanban() {
  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, overflow: "hidden", fontSize: 11,
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      transform: "perspective(1000px) rotateY(-6deg) rotateX(3deg)",
    }}>
      <div style={{ background: "#111", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
        <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 10 }}>● 2 novos</span>
        <span style={{ color: "#eab308", fontWeight: 700, fontSize: 10 }}>● 1 preparo</span>
        <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 10 }}>● 1 pronto</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {[
          { col: "NOVOS", color: "#ef4444", items: [{ t: "Mesa 3", i: "2× X-Burguer" }, { t: "Mesa 7", i: "1× Frango" }] },
          { col: "PREPARO", color: "#eab308", items: [{ t: "Mesa 1", i: "3× Pizza" }] },
          { col: "PRONTOS", color: "#22c55e", items: [{ t: "Mesa 5", i: "2× Açaí" }] },
        ].map(({ col, color, items }) => (
          <div key={col} style={{ borderRight: "1px solid rgba(255,255,255,0.05)", padding: "8px 6px" }}>
            <p style={{ color, fontSize: 9, fontWeight: 800, margin: "0 0 6px", letterSpacing: "1px" }}>{col}</p>
            {items.map((item) => (
              <div key={item.t} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6, padding: "5px 7px", marginBottom: 4,
              }}>
                <p style={{ fontWeight: 700, color: "#fff", margin: "0 0 2px", fontSize: 10 }}>{item.t}</p>
                <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 9 }}>{item.i}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MockPDV() {
  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "12px", fontSize: 11,
      boxShadow: "0 16px 60px rgba(0,0,0,0.5)",
      transform: "perspective(1000px) rotateY(-6deg) rotateX(3deg)",
    }}>
      <p style={{ fontWeight: 800, margin: "0 0 8px", fontSize: 12 }}>💳 Pagamento — Mesa 3</p>
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>2× X-Burguer</span>
          <span style={{ fontSize: 10 }}>R$ 68,00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 6, marginTop: 4 }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 14 }}>R$ 68,00</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[["💵", "Dinheiro"], ["💳", "Cartão"], ["📲", "PIX"]].map(([icon, label]) => (
          <div key={label} style={{
            flex: 1, textAlign: "center",
            border: label === "PIX" ? `1.5px solid ${BRAND}` : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "5px 3px",
            background: label === "PIX" ? BRAND_DIM : "transparent",
          }}>
            <div style={{ fontSize: 14 }}>{icon}</div>
            <div style={{ fontSize: 9, color: label === "PIX" ? BRAND : "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
