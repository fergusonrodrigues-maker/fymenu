"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory, updateCategory, deleteCategory,
  createProduct, updateProduct, deleteProduct,
  addUpsellItem, removeUpsellItem,
  updateUnit,
} from "./actions";

// ─── Types ─────────────────────────────────────────────────────────────────
type Restaurant = { id: string; name: string; plan: string; status: string; trial_ends_at: string; whatsapp: string | null; instagram: string | null };
type Unit = { id: string; name: string; slug: string; address: string; city: string | null; neighborhood: string | null; whatsapp: string | null; instagram: string | null; logo_url: string | null; maps_url: string | null; is_published: boolean };
type Category = { id: string; name: string; order_index: number | null };
type Product = { id: string; category_id: string; name: string; description: string | null; price_type: string; base_price: number | null; thumbnail_url: string | null; video_url: string | null; order_index: number | null; is_active: boolean };
type Profile = { first_name: string | null; last_name: string | null; phone: string | null; email: string | undefined };

// ─── Modal backdrop ─────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "flex-end",
      animation: "fadeIn 0.2s ease",
    }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @media (min-width: 640px) {
          .modal-sheet { border-radius: 24px !important; max-width: 560px !important; margin: auto !important; align-self: center !important; max-height: 85vh !important; }
        }
      `}</style>
      <div
        className="modal-sheet"
        style={{
          width: "100%", maxHeight: "92vh",
          background: "linear-gradient(180deg, #161616 0%, #111 100%)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden", display: "flex", flexDirection: "column",
          animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px 12px" }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* Content */}
        <div style={{ overflowY: "auto", padding: "0 24px 32px", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Input style ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
  outline: "none",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DashboardClient({
  restaurant, unit, profile, categories, products, upsellItems, analytics, tvCount,
}: {
  restaurant: Restaurant; unit: Unit | null; profile: Profile;
  categories: Category[]; products: Product[];
  upsellItems: any[]; analytics: { views: number; clicks: number; orders: number };
  tvCount: number;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"analytics" | "cardapio" | "pedidos" | "unidade" | "plano" | "config" | "tv" | null>(null);
  const open = (m: typeof modal) => setModal(m);
  const close = () => setModal(null);

  const trialDays = Math.max(0, Math.ceil((new Date(restaurant.trial_ends_at).getTime() - Date.now()) / 86400000));
  const isPro = restaurant.plan === "pro";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0a; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        .card:active { transform: scale(0.97); }
        .card { transition: transform 0.15s, background 0.2s; }
        .card:hover { background: rgba(255,255,255,0.07) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        input, textarea, select { outline: none; font-family: inherit; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,174,0.07) 0%, transparent 60%), #0a0a0a",
        fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
        padding: "env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)",
      }}>

        {/* Header */}
        <div style={{ padding: "56px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {unit?.logo_url ? (
                <img src={unit.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,255,174,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
              )}
              <div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{unit?.name ?? restaurant.name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{unit?.is_published ? "● Publicado" : "○ Não publicado"}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {unit && (
              <a href={`/u/${unit.slug}`} target="_blank" rel="noreferrer" style={{
                padding: "8px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>Ver cardápio ↗</a>
            )}
          </div>
        </div>

        {/* Trial banner */}
        {restaurant.status === "trial" && trialDays <= 5 && (
          <div style={{ margin: "12px 24px", padding: "12px 16px", borderRadius: 14, background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>
              ⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} de trial restante{trialDays !== 1 ? "s" : ""}
            </div>
            <button onClick={() => open("plano")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,180,0,0.2)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ver planos</button>
          </div>
        )}

        {/* Grid principal */}
        <div style={{
          padding: "16px 16px 100px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}>

          {/* Analytics */}
          <div className="card" onClick={() => open("analytics")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 24px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Últimos 7 dias</div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Analytics</div>
              </div>
              <div style={{ fontSize: 24 }}>📊</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Visitas", value: analytics.views, color: "#00ffae" },
                { label: "Cliques", value: analytics.clicks, color: "#60a5fa" },
                { label: "Pedidos", value: analytics.orders, color: "#f472b6" },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ color: stat.color, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cardápio */}
          <div className="card" onClick={() => open("cardapio")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 140,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 28 }}>📋</div>
            <div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Cardápio</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{products.length} produto{products.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Pedidos */}
          <div className="card" onClick={() => open("pedidos")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 140,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 28 }}>🛒</div>
            <div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Pedidos</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{analytics.orders} hoje</div>
            </div>
          </div>

          {/* Unidade */}
          <div className="card" onClick={() => open("unidade")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>📍</div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Unidade</div>
              <div style={{ color: unit?.is_published ? "#00ffae" : "rgba(255,255,255,0.35)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: unit?.is_published ? "#00ffae" : "rgba(255,255,255,0.2)", display: "inline-block", animation: unit?.is_published ? "pulse 2s infinite" : "none" }} />
                {unit?.is_published ? "Publicado" : "Não publicado"}
              </div>
            </div>
          </div>

          {/* Modo TV */}
          <div className="card" onClick={() => open("tv")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>📺</div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Modo TV</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{tvCount} vídeo{tvCount !== 1 ? "s" : ""} ativo{tvCount !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Plano */}
          <div className="card" onClick={() => open("plano")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: isPro
              ? "linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(251,146,60,0.08) 100%)"
              : "rgba(255,255,255,0.04)",
            border: isPro ? "1px solid rgba(250,204,21,0.2)" : "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>{isPro ? "⭐" : "🎯"}</div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Plano</div>
              <div style={{ color: isPro ? "#fbbf24" : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: isPro ? 700 : 400 }}>
                {isPro ? "Pro" : restaurant.status === "trial" ? `Trial · ${trialDays}d` : "Basic"}
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="card" onClick={() => open("config")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>⚙️</div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Configurações</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{profile.email?.split("@")[0]}</div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Modais ─────────────────────────────────────────────────────────── */}

      {/* Analytics */}
      <Modal open={modal === "analytics"} onClose={close} title="Analytics">
        <AnalyticsModal analytics={analytics} unit={unit} />
      </Modal>

      {/* Cardápio */}
      <Modal open={modal === "cardapio"} onClose={close} title="Cardápio">
        <CardapioModal
          unit={unit}
          categories={categories}
          products={products}
          upsellItems={upsellItems}
          onClose={close}
        />
      </Modal>

      {/* Pedidos */}
      <Modal open={modal === "pedidos"} onClose={close} title="Pedidos">
        <PedidosModal unit={unit} />
      </Modal>

      {/* Unidade */}
      <Modal open={modal === "unidade"} onClose={close} title="Unidade">
        <UnidadeModal unit={unit} onClose={close} />
      </Modal>

      {/* Modo TV */}
      <Modal open={modal === "tv"} onClose={close} title="Modo TV">
        <TVModal unit={unit} tvCount={tvCount} />
      </Modal>

      {/* Plano */}
      <Modal open={modal === "plano"} onClose={close} title="Plano">
        <PlanoModal restaurant={restaurant} trialDays={trialDays} />
      </Modal>

      {/* Config */}
      <Modal open={modal === "config"} onClose={close} title="Configurações">
        <ConfigModal profile={profile} />
      </Modal>
    </>
  );
}

// ─── Analytics Modal ─────────────────────────────────────────────────────────
function AnalyticsModal({ analytics, unit }: { analytics: any; unit: Unit | null }) {
  const stats = [
    { label: "Visitas ao cardápio", value: analytics.views, icon: "👁", color: "#00ffae", desc: "últimos 7 dias" },
    { label: "Cliques em produtos", value: analytics.clicks, icon: "👆", color: "#60a5fa", desc: "últimos 7 dias" },
    { label: "Pedidos enviados", value: analytics.orders, icon: "✅", color: "#f472b6", desc: "últimos 7 dias" },
  ];
  const conversion = analytics.views > 0 ? ((analytics.orders / analytics.views) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 28 }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>Taxa de conversão</div>
        <div style={{ color: "#fff", fontSize: 32, fontWeight: 900 }}>{conversion}%</div>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>visitas → pedidos</div>
      </div>
      {unit && (
        <a href={`/u/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Ver cardápio público ↗
        </a>
      )}
    </div>
  );
}

// ─── Cardápio Modal ───────────────────────────────────────────────────────────
function CardapioModal({ unit, categories, products, upsellItems, onClose }: {
  unit: Unit | null; categories: Category[]; products: Product[]; upsellItems: any[]; onClose: () => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(categories[0]?.id ?? null);
  const productsByCat = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Links rápidos */}
      <div style={{ display: "flex", gap: 8 }}>
        {unit && (
          <a href={`/u/${unit.slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver cardápio ↗</a>
        )}
        <a href="/dashboard/ia" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, background: "rgba(0,255,174,0.08)", border: "1px solid rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>✨ Importar com IA</a>
      </div>

      {/* Nova categoria */}
      {unit && (
        <form action={createCategory} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="unit_id" value={unit.id} />
          <input name="name" placeholder="+ Nova categoria" required style={{ ...inp, flex: 1 }} />
          <button type="submit" style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Criar</button>
        </form>
      )}

      {categories.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>Crie sua primeira categoria acima!</div>
      )}

      {categories.map((cat) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];
        return (
          <div key={cat.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 10, cursor: "pointer" }} onClick={() => setExpandedCat(isOpen ? null : cat.id)}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
              <form action={updateCategory} onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: "flex", gap: 8 }}>
                <input type="hidden" name="id" value={cat.id} />
                <input name="name" defaultValue={cat.name} style={{ ...inp, flex: 1, fontSize: 15, fontWeight: 800 }} />
                <button type="submit" style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Salvar</button>
              </form>
              <form action={deleteCategory} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={cat.id} />
                <button type="submit" style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,80,80,0.12)", color: "#f87171", fontSize: 12, cursor: "pointer" }}>✕</button>
              </form>
            </div>
            {isOpen && (
              <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                {catProducts.length === 0 && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, padding: "8px 0" }}>Nenhum produto nesta categoria.</div>}
                {catProducts.map((p) => (
                  <ProductRowInline key={p.id} product={p} allProducts={products.filter((o) => o.id !== p.id)} />
                ))}
                <NewProductFormInline categoryId={cat.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductRowInline({ product, allProducts }: { product: Product; allProducts: Product[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "11px 12px", gap: 10, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
            {product.price_type === "variable" ? "Preço variável" : product.base_price != null ? `R$ ${Number(product.base_price).toFixed(2).replace(".", ",")}` : "Sem preço"}
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form action={updateProduct} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10 }}>
            <input type="hidden" name="id" value={product.id} />
            <input name="name" defaultValue={product.name} placeholder="Nome" required style={inp} />
            <textarea name="description" defaultValue={product.description ?? ""} placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input name="base_price" defaultValue={product.base_price != null ? String(product.base_price).replace(".", ",") : ""} placeholder="Preço (ex: 29,90)" inputMode="decimal" style={inp} />
              <select name="price_type" defaultValue={product.price_type} style={{ ...inp, cursor: "pointer" }}>
                <option value="fixed">Preço fixo</option>
                <option value="variable">Preço variável</option>
              </select>
            </div>
            <input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ""} placeholder="URL da thumbnail" style={inp} />
            <input name="video_url" defaultValue={product.video_url ?? ""} placeholder="URL do vídeo" style={inp} />
            <button type="submit" style={{ padding: "10px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salvar produto</button>
          </form>
          <form action={deleteProduct} style={{ marginTop: 8 }} onSubmit={(e) => { if (!confirm("Excluir produto?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" style={{ padding: "10px", borderRadius: 10, border: "none", background: "rgba(255,80,80,0.10)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}>Excluir produto</button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewProductFormInline({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ padding: "10px", borderRadius: 10, width: "100%", background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>
      + Adicionar produto
    </button>
  );
  return (
    <form action={createProduct} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nome do produto" required style={inp} />
      <textarea name="description" placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="base_price" placeholder="Preço (ex: 29,90)" inputMode="decimal" style={inp} />
        <select name="price_type" defaultValue="fixed" style={{ ...inp, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
      </div>
      <input name="thumbnail_url" placeholder="URL da thumbnail" style={inp} />
      <input name="video_url" placeholder="URL do vídeo" style={inp} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
      </div>
    </form>
  );
}

// ─── Pedidos Modal ────────────────────────────────────────────────────────────
function PedidosModal({ unit }: { unit: Unit | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>WhatsApp</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 16 }}>Os pedidos são enviados automaticamente para o WhatsApp cadastrado na unidade com mensagem estruturada e tracking.</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>WhatsApp atual: <span style={{ color: "#fff" }}>{unit?.whatsapp ?? "Não configurado"}</span></div>
      </div>
      <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🛵</div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>iFood</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Redireciona o cliente para o seu perfil no iFood. Configure na aba Unidade.</div>
      </div>
      <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.15)" }}>
        <div style={{ color: "#fbbf24", fontSize: 13 }}>💡 Configure o WhatsApp e as redes sociais na seção <strong>Unidade</strong> para ativar o recebimento de pedidos.</div>
      </div>
    </div>
  );
}

// ─── Unidade Modal ────────────────────────────────────────────────────────────
function UnidadeModal({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  if (!unit) return <div style={{ color: "rgba(255,255,255,0.4)", paddingTop: 16 }}>Nenhuma unidade encontrada.</div>;
  return (
    <form action={updateUnit} onSubmit={() => setTimeout(onClose, 300)} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      <input type="hidden" name="id" value={unit.id} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
        {unit.logo_url && <img src={unit.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>URL do logo</div>
          <input name="logo_url" defaultValue={unit.logo_url ?? ""} placeholder="https://..." style={inp} />
        </div>
      </div>

      {[
        { name: "name", label: "Nome da unidade", value: unit.name },
        { name: "address", label: "Endereço", value: unit.address },
        { name: "city", label: "Cidade", value: unit.city ?? "" },
        { name: "neighborhood", label: "Bairro", value: unit.neighborhood ?? "" },
        { name: "whatsapp", label: "WhatsApp", value: unit.whatsapp ?? "" },
        { name: "instagram", label: "Instagram", value: unit.instagram ?? "" },
        { name: "maps_url", label: "Link do Google Maps", value: unit.maps_url ?? "" },
      ].map((f) => (
        <div key={f.name}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
          <input name={f.name} defaultValue={f.value} style={inp} />
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 4px" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Publicar cardápio</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Cardápio visível publicamente</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" name="is_published" defaultChecked={unit.is_published} style={{ display: "none" }} id="pub-toggle" />
          <div
            style={{
              width: 44, height: 26, borderRadius: 13,
              background: unit.is_published ? "#00ffae" : "rgba(255,255,255,0.15)",
              position: "relative", transition: "background 0.2s",
            }}
            onClick={(e) => {
              const cb = document.getElementById("pub-toggle") as HTMLInputElement;
              if (cb) { cb.checked = !cb.checked; (e.currentTarget as HTMLDivElement).style.background = cb.checked ? "#00ffae" : "rgba(255,255,255,0.15)"; (e.currentTarget.querySelector("span") as HTMLSpanElement).style.transform = cb.checked ? "translateX(18px)" : "translateX(0)"; }
            }}
          >
            <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3, transition: "transform 0.2s", transform: unit.is_published ? "translateX(18px)" : "translateX(0)" }} />
          </div>
        </label>
      </div>

      <button type="submit" style={{ marginTop: 8, padding: "14px", borderRadius: 14, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Salvar unidade</button>
    </form>
  );
}

// ─── TV Modal ─────────────────────────────────────────────────────────────────
function TVModal({ unit, tvCount }: { unit: Unit | null; tvCount: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div style={{ borderRadius: 16, padding: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📺</div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{tvCount} vídeo{tvCount !== 1 ? "s" : ""} ativo{tvCount !== 1 ? "s" : ""}</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 16 }}>Exiba seus produtos em modo fullscreen para TV, totem ou projetor.</div>
        {unit && (
          <a href={`/u/${unit.slug}/tv`} target="_blank" rel="noreferrer" style={{ display: "block", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 10 }}>
            Abrir display público ↗
          </a>
        )}
        <a href="/dashboard/tv" style={{ display: "block", padding: "12px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Gerenciar vídeos →
        </a>
      </div>
      <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          🎬 Vídeos até 15 segundos · Sem som · Autoplay · Vertical ou horizontal
        </div>
      </div>
    </div>
  );
}

// ─── Plano Modal ──────────────────────────────────────────────────────────────
function PlanoModal({ restaurant, trialDays }: { restaurant: Restaurant; trialDays: number }) {
  const isPro = restaurant.plan === "pro";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Status atual */}
      <div style={{ borderRadius: 16, padding: "20px", background: isPro ? "linear-gradient(135deg, rgba(250,204,21,0.08), rgba(251,146,60,0.08))" : "rgba(255,255,255,0.04)", border: isPro ? "1px solid rgba(250,204,21,0.2)" : "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{isPro ? "⭐" : "🎯"}</div>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{isPro ? "Plano Pro" : restaurant.status === "trial" ? `Trial ativo` : "Plano Basic"}</div>
        {restaurant.status === "trial" && <div style={{ color: "#fbbf24", fontSize: 13, marginTop: 4 }}>⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} restante{trialDays !== 1 ? "s" : ""}</div>}
      </div>

      {/* Planos */}
      {!isPro && (
        <>
          {[
            { name: "Basic", price: "Grátis", features: ["1 unidade", "Cardápio digital", "Modo TV", "IA básica"], color: "rgba(255,255,255,0.06)" },
            { name: "Pro", price: "Em breve", features: ["Múltiplas unidades", "Analytics avançado", "Relatórios", "Suporte prioritário"], color: "rgba(0,255,174,0.06)", highlight: true },
          ].map((plan) => (
            <div key={plan.name} style={{ borderRadius: 16, padding: "18px 20px", background: plan.color, border: plan.highlight ? "1px solid rgba(0,255,174,0.2)" : "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{plan.name}</div>
                <div style={{ color: plan.highlight ? "#00ffae" : "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 700 }}>{plan.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: plan.highlight ? "#00ffae" : "rgba(255,255,255,0.3)" }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Config Modal ─────────────────────────────────────────────────────────────
function ConfigModal({ profile }: { profile: Profile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 12 }}>Conta</div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{profile.first_name} {profile.last_name}</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>{profile.email}</div>
        {profile.phone && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>{profile.phone}</div>}
      </div>
      <a href="/dashboard/account" style={{ display: "block", padding: "14px 20px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
        ✏️ Editar perfil
      </a>
      <form action="/api/auth/signout" method="post">
        <button type="submit" style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: "rgba(255,80,80,0.08)", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
          🚪 Sair da conta
        </button>
      </form>
    </div>
  );
}