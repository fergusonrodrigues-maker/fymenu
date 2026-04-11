"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory, createProduct } from "../actions";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import ProductRow from "../ProductRow";
import { Unit, Category, Product, Restaurant } from "../types";

type CustomSection = { id: string; name: string; icon: string; allows_video: boolean; allows_alcoholic_toggle: boolean };

function getSectionConfig(sectionValue: string, customSections: CustomSection[]) {
  const defaults: Record<string, { allows_video: boolean; allows_alcoholic: boolean }> = {
    pratos: { allows_video: true, allows_alcoholic: false },
    drinks: { allows_video: true, allows_alcoholic: true },
    bebidas: { allows_video: false, allows_alcoholic: true },
  };
  if (defaults[sectionValue]) return defaults[sectionValue];
  const custom = customSections.find(cs => cs.name.toLowerCase().replace(/\s+/g, "_") === sectionValue);
  if (custom) return { allows_video: custom.allows_video, allows_alcoholic: custom.allows_alcoholic_toggle };
  return { allows_video: true, allows_alcoholic: false };
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-card-hover)",
  color: "var(--dash-text)", fontSize: 13, fontWeight: 500, boxSizing: "border-box",
  outline: "none", transition: "border-color 0.2s",
};
const inpFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--dash-accent)";
  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,255,174,0.08)";
};
const inpBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "var(--dash-border)";
  e.currentTarget.style.boxShadow = "none";
};

function NewProductFormInline({ categoryId, section, customSections, anyProductExpanded, onOpen }: { categoryId: string; section: string; customSections: CustomSection[]; anyProductExpanded: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [priceType, setPriceType] = useState("fixed");
  const [isAlcoholic, setIsAlcoholic] = useState(false);

  const { allows_video: showVideo, allows_alcoholic: showAlcoholic } = getSectionConfig(section, customSections);

  useEffect(() => {
    if (anyProductExpanded) setOpen(false);
  }, [anyProductExpanded]);

  function handleOpen() {
    onOpen();
    setPriceType("fixed");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setPriceType("fixed");
    setIsAlcoholic(false);
  }

  if (!open) return (
    <button onClick={handleOpen} style={{ padding: "10px", borderRadius: 10, width: "100%", background: "transparent", border: "1px dashed var(--dash-border)", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer" }}>
      + Adicionar produto
    </button>
  );
  return (
    <form
      action={async (formData) => {
        await createProduct(formData);
        handleClose();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, border: "1px solid var(--dash-border)", background: "var(--dash-card)" }}
    >
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nome do produto" required style={inp} />
      <textarea name="description" placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <select name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value)} style={{ ...inp, background: undefined as any, backgroundColor: "var(--dash-card-hover)", flex: 1, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
        {priceType === "fixed" && (
          <input name="base_price" placeholder="Preço (ex: 29,90)" inputMode="decimal" style={{ ...inp, flex: 1 }} />
        )}
      </div>
      {priceType === "variable" && (
        <p style={{ color: "var(--dash-text-muted)", fontSize: 12, margin: 0 }}>
          💡 Adicione as variações de preço após criar o produto (clique no produto para editar).
        </p>
      )}
      {showAlcoholic && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--dash-card)", border: "1px solid var(--dash-border)" }}>
          <button
            type="button"
            onClick={() => setIsAlcoholic(!isAlcoholic)}
            style={{ width: 44, height: 26, borderRadius: 13, background: isAlcoholic ? "var(--dash-accent)" : "var(--dash-card-hover)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
          >
            <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3, transition: "transform 0.2s", transform: isAlcoholic ? "translateX(18px)" : "translateX(0)" }} />
          </button>
          <input type="hidden" name="is_alcoholic" value={isAlcoholic ? "on" : "off"} />
          <span style={{ fontSize: 13, color: "var(--dash-text-secondary)" }}>{section === 'drinks' ? "Drink alcoólico" : "Bebida alcoólica"}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={handleClose} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "var(--dash-shadow)" }}>Cancelar</button>
        <button type="submit" style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>Criar</button>
      </div>
    </form>
  );
}

const PLAN_FEATURES_CARDAPIO: Record<string, string[]> = {
  menu: [],
  menupro: [],
  business: ["recipe"],
};

export default function CardapioModal({ unit, categories, products, upsellItems, restaurant, onClose }: {
  unit: Unit | null; categories: Category[]; products: Product[]; upsellItems: any[]; restaurant?: Restaurant | null; onClose: () => void;
}) {
  const hasRecipeFeature = PLAN_FEATURES_CARDAPIO[restaurant?.plan as keyof typeof PLAN_FEATURES_CARDAPIO]?.includes("recipe") || false;

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState<Record<string, boolean>>({});
  const [catActiveState, setCatActiveState] = useState<Record<string, boolean>>({});

  function isCatActive(cat: any) {
    if (catActiveState[cat.id] !== undefined) return catActiveState[cat.id];
    return cat.is_active !== false;
  }
  const [newCatType, setNewCatType] = useState<"food" | "drink">("food");
  const [newCatSection, setNewCatSection] = useState<string>('pratos');
  const [editCatSection, setEditCatSection] = useState<Record<string, string>>({});
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionIcon, setNewSectionIcon] = useState("📂");
  const [newSectionVideo, setNewSectionVideo] = useState(true);
  const [newSectionAlcoholic, setNewSectionAlcoholic] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "upload" | "processing" | "preview" | "done">("idle");
  const [importData, setImportData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  // Schedule states (scalar — safe because only one cat expanded at a time)
  const [editScheduleEnabled, setEditScheduleEnabled] = useState(false);
  const [editDays, setEditDays] = useState<string[]>(["seg","ter","qua","qui","sex","sab","dom"]);
  const [editStartTime, setEditStartTime] = useState("11:00");
  const [editEndTime, setEditEndTime] = useState("23:00");

  // AI suggestion states
  const [generatingAISuggestion, setGeneratingAISuggestion] = useState(false);
  const [aiSuggestionResult, setAiSuggestionResult] = useState<string | null>(null);

  const [orderedCats, setOrderedCats] = useState(categories);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const dragElRef = useRef<HTMLDivElement | null>(null);

  // Copy from unit states
  const [otherUnits, setOtherUnits] = useState<any[]>([]);
  const [showCopyFromUnit, setShowCopyFromUnit] = useState(false);
  const [selectedSourceUnit, setSelectedSourceUnit] = useState<string>("");
  const [sourcePreview, setSourcePreview] = useState<any>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => { setOrderedCats(categories); }, [categories]);

  useEffect(() => {
    if (!unit) return;
    createSupabaseClient().from("custom_sections").select("*").eq("unit_id", unit.id).then(({ data }) => {
      if (data) setCustomSections(data);
    });
  }, [unit?.id]);

  useEffect(() => {
    if (!unit || !restaurant) return;
    createSupabaseClient()
      .from("units")
      .select("id, name, slug")
      .eq("restaurant_id", restaurant.id)
      .neq("id", unit.id)
      .then(({ data }) => { if (data) setOtherUnits(data); });
  }, [restaurant?.id, unit?.id]);

  const defaultSections = [
    { value: "pratos", label: "Pratos", icon: "🍽️", allows_video: true, allows_alcoholic: false },
    { value: "drinks", label: "Drinks", icon: "🍸", allows_video: true, allows_alcoholic: true },
    { value: "bebidas", label: "Bebidas", icon: "🥤", allows_video: false, allows_alcoholic: true },
  ];
  const allSections = [...defaultSections, ...customSections.map(cs => ({
    value: cs.name.toLowerCase().replace(/\s+/g, "_"),
    label: cs.name,
    icon: cs.icon,
    allows_video: cs.allows_video,
    allows_alcoholic: cs.allows_alcoholic_toggle,
  }))];

  async function handleCreateSection() {
    if (!newSectionName.trim() || !unit) return;
    const { data, error } = await createSupabaseClient().from("custom_sections").insert({
      unit_id: unit.id,
      name: newSectionName.trim(),
      icon: newSectionIcon || "📂",
      allows_video: newSectionVideo,
      allows_alcoholic_toggle: newSectionAlcoholic,
    }).select().single();
    if (!error && data) {
      setCustomSections(prev => [...prev, data]);
      setNewCatSection(data.name.toLowerCase().replace(/\s+/g, "_"));
      setShowCreateSection(false);
      setNewSectionName(""); setNewSectionIcon("📂"); setNewSectionVideo(true); setNewSectionAlcoholic(false);
    }
  }

  function handleReorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const updated = [...orderedCats];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setOrderedCats(updated);
    updated.forEach((cat, i) => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("name", cat.name);
      fd.set("order_index", String(i));
      updateCategory(fd);
    });
  }

  function onTouchStartDrag(e: React.TouchEvent, idx: number) {
    e.stopPropagation();
    setDragIdx(idx);
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    dragElRef.current = (e.currentTarget as HTMLElement).closest('[data-cat-idx]') as HTMLDivElement;
    if (dragElRef.current) {
      dragElRef.current.style.transition = "none";
      dragElRef.current.style.zIndex = "999";
      dragElRef.current.style.position = "relative";
    }
  }

  function onTouchMoveDrag(e: React.TouchEvent) {
    if (dragIdx === null || !dragElRef.current) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    touchCurrentY.current = y;
    const dy = y - touchStartY.current;
    dragElRef.current.style.transform = `translateY(${dy}px) scale(1.03)`;
    dragElRef.current.style.opacity = "0.85";
    dragElRef.current.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
    const items = document.querySelectorAll('[data-cat-idx]');
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y > mid - 20 && y < mid + 20) {
        const idx = parseInt(item.getAttribute('data-cat-idx') || '-1');
        if (idx !== dragIdx) setOverIdx(idx);
      }
    });
  }

  function onTouchEndDrag() {
    if (dragIdx !== null && overIdx !== null) {
      handleReorder(dragIdx, overIdx);
    }
    if (dragElRef.current) {
      dragElRef.current.style.transition = "all 0.25s ease";
      dragElRef.current.style.transform = "";
      dragElRef.current.style.opacity = "";
      dragElRef.current.style.boxShadow = "";
      dragElRef.current.style.zIndex = "";
      dragElRef.current.style.position = "";
      dragElRef.current = null;
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  const router = useRouter();

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportStep("processing");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ia/import-menu", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportData(json.importData); setImportStep("preview"); }
      else { alert(json.error || "Erro ao processar arquivo"); setImportStep("upload"); }
    } catch { alert("Erro de conexão"); setImportStep("upload"); }
  }

  async function handleImportText(text: string) {
    setImportStep("processing");
    const formData = new FormData();
    formData.append("text", text);
    try {
      const res = await fetch("/api/ia/import-menu", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportData(json.importData); setImportStep("preview"); }
      else { alert(json.error || "Erro ao processar texto"); setImportStep("upload"); }
    } catch { alert("Erro de conexão"); setImportStep("upload"); }
  }

  async function handleConfirmImport() {
    if (!importData?.categories || !unit) return;
    setImporting(true);
    const supabase = createSupabaseClient();
    try {
      const { data: existingCats } = await supabase
        .from("categories")
        .select("order_index")
        .eq("unit_id", unit.id)
        .order("order_index", { ascending: false })
        .limit(1);
      let orderIndex = (existingCats?.[0]?.order_index ?? -1) + 1;

      for (const cat of importData.categories) {
        if (!cat.products || cat.products.length === 0) continue;

        const { data: newCat, error: catErr } = await supabase
          .from("categories")
          .insert({ unit_id: unit.id, name: cat.name, order_index: orderIndex++, section: "pratos" })
          .select().single();

        if (catErr || !newCat) { console.error("Erro categoria:", catErr); continue; }

        const productInserts = cat.products.map((prod: any) => ({
          category_id: newCat.id,
          unit_id: unit.id,
          name: prod.name,
          description: prod.description || null,
          base_price: Math.round((prod.price || 0) * 100),
          price_type: prod.variations?.length > 0 ? "variable" : "fixed",
          is_active: true,
          order_index: 0,
        }));

        const { data: newProducts, error: prodErr } = await supabase
          .from("products")
          .insert(productInserts)
          .select();

        if (prodErr) { console.error("Erro produtos:", prodErr); continue; }

        if (newProducts) {
          for (let i = 0; i < cat.products.length; i++) {
            const prod = cat.products[i];
            const newProd = newProducts[i];
            if (prod.variations?.length > 0 && newProd) {
              await supabase.from("product_variations").insert(
                prod.variations.map((v: any, vi: number) => ({
                  product_id: newProd.id,
                  name: v.name,
                  price: Math.round((v.price || 0) * 100),
                  order_index: vi,
                  is_active: true,
                }))
              );
            }
          }
        }
      }

      setImportStep("done");
    } catch (err) {
      console.error("Erro na importação:", err);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  async function handleAISuggestion() {
    if (!unit) return;
    setGeneratingAISuggestion(true);
    try {
      const supabase = createSupabaseClient();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("menu_events")
        .select("product_id")
        .eq("unit_id", unit.id)
        .eq("event", "product_click")
        .gte("created_at", thirtyDaysAgo);

      const clickCounts: Record<string, number> = {};
      for (const e of events || []) {
        if (e.product_id) clickCounts[e.product_id] = (clickCounts[e.product_id] || 0) + 1;
      }

      const { data: orders } = await supabase
        .from("order_intents")
        .select("items")
        .eq("unit_id", unit.id)
        .eq("status", "confirmed")
        .gte("created_at", thirtyDaysAgo);

      const salesCounts: Record<string, number> = {};
      for (const o of orders || []) {
        const items = Array.isArray(o.items) ? o.items : [];
        for (const item of items) {
          const name = item.name || "";
          salesCounts[name] = (salesCounts[name] || 0) + (item.qty || 1);
        }
      }

      const productData = orderedCats.flatMap(cat =>
        (productsByCat[cat.id] || []).map((p: any) => ({
          name: p.name,
          category: cat.name,
          price: p.base_price,
          clicks: clickCounts[p.id] || 0,
          sales: salesCounts[p.name] || 0,
          hasVideo: !!p.video_url,
          hasThumb: !!p.thumbnail_url,
        }))
      );

      const res = await fetch("/api/ia/suggest-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productData }),
      });
      const json = await res.json();
      if (res.ok) setAiSuggestionResult(json.suggestions);
    } catch (err) { console.error(err); }
    finally { setGeneratingAISuggestion(false); }
  }

  async function handleCopyFromUnit() {
    if (!selectedSourceUnit || !sourcePreview || !unit) return;
    const supabase = createSupabaseClient();
    setCopying(true);
    try {
      const { data: existingCats } = await supabase
        .from("categories")
        .select("order_index")
        .eq("unit_id", unit.id)
        .order("order_index", { ascending: false })
        .limit(1);
      let orderIndex = (existingCats?.[0]?.order_index ?? -1) + 1;

      const { data: sourceCats } = await supabase
        .from("categories")
        .select("*")
        .eq("unit_id", selectedSourceUnit)
        .eq("is_active", true)
        .order("order_index");

      for (const srcCat of sourceCats || []) {
        const slug = srcCat.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        const { data: newCat, error: catErr } = await supabase
          .from("categories")
          .insert({
            unit_id: unit.id,
            name: srcCat.name,
            type: srcCat.type,
            category_type: srcCat.category_type,
            section: srcCat.section,
            is_featured: srcCat.is_featured,
            is_active: true,
            order_index: orderIndex++,
            slug,
            schedule_enabled: srcCat.schedule_enabled,
            available_days: srcCat.available_days,
            start_time: srcCat.start_time,
            end_time: srcCat.end_time,
          })
          .select().single();

        if (catErr || !newCat) { console.error("Erro cat:", catErr); continue; }

        const { data: srcProducts } = await supabase
          .from("products")
          .select("*")
          .eq("category_id", srcCat.id)
          .eq("is_active", true)
          .order("order_index");

        if (!srcProducts || srcProducts.length === 0) continue;

        const productInserts = srcProducts.map(p => ({
          category_id: newCat.id,
          unit_id: unit.id,
          name: p.name,
          description: p.description,
          base_price: p.base_price,
          price_type: p.price_type,
          is_active: true,
          order_index: p.order_index,
          allergens: p.allergens,
          nutrition: p.nutrition,
          preparation_time: p.preparation_time,
          product_type: p.product_type,
          is_alcoholic: p.is_alcoholic,
          is_age_restricted: p.is_age_restricted,
        }));

        const { data: newProducts, error: prodErr } = await supabase
          .from("products")
          .insert(productInserts)
          .select();

        if (prodErr) { console.error("Erro prod:", prodErr); continue; }

        if (newProducts) {
          for (let i = 0; i < srcProducts.length; i++) {
            const srcProd = srcProducts[i];
            const newProd = newProducts[i];
            if (!newProd) continue;

            const { data: srcVars } = await supabase
              .from("product_variations")
              .select("*")
              .eq("product_id", srcProd.id)
              .order("order_index");

            if (srcVars && srcVars.length > 0) {
              await supabase.from("product_variations").insert(
                srcVars.map(v => ({
                  product_id: newProd.id,
                  name: v.name,
                  price: v.price,
                  order_index: v.order_index,
                  stock: v.stock,
                }))
              );
            }

            const { data: srcAddons } = await supabase
              .from("product_addons")
              .select("*")
              .eq("product_id", srcProd.id);

            if (srcAddons && srcAddons.length > 0) {
              await supabase.from("product_addons").insert(
                srcAddons.map(a => ({
                  product_id: newProd.id,
                  name: a.name,
                  price: a.price,
                  is_required: a.is_required,
                  max_select: a.max_select,
                  group_name: a.group_name,
                  order_index: a.order_index,
                  is_active: a.is_active,
                }))
              );
            }
          }
        }
      }

      setShowCopyFromUnit(false);
      setSourcePreview(null);
      setSelectedSourceUnit("");
      router.refresh();
    } catch (err) {
      console.error("Erro ao copiar:", err);
      alert("Erro ao copiar cardápio");
    } finally {
      setCopying(false);
    }
  }

  const productsByCat = orderedCats.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>

      {/* ── IMPORT FLOW ── */}
      {importStep !== "idle" && (
        <div style={{ padding: "0 4px" }}>
          <button onClick={() => { setImportStep("idle"); setImportData(null); setPastedText(""); }} style={{
            padding: "6px 14px", borderRadius: 8, background: "var(--dash-card)",
            border: "none", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer", marginBottom: 16, fontFamily: "inherit",
            boxShadow: "var(--dash-shadow)",
          }}>← Voltar ao cardápio</button>

          {/* Upload */}
          {importStep === "upload" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)", marginBottom: 6 }}>Importar cardápio com IA</div>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 20 }}>
                Envie um arquivo ou cole o cardápio em texto. A IA organiza tudo automaticamente.
              </div>
              <div
                onClick={() => importFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-accent)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--dash-border)"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-border)"; handleImportFile(e.dataTransfer.files[0]); }}
                style={{
                  border: "2px dashed var(--dash-border)", borderRadius: 20,
                  padding: "40px 20px", textAlign: "center", cursor: "pointer",
                  transition: "border-color 0.3s", marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Arraste seu cardápio aqui</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 12 }}>ou clique para selecionar</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                  {["CSV", "Excel", "PDF", "Foto", "JSON"].map(f => (
                    <span key={f} style={{ padding: "3px 10px", borderRadius: 6, background: "var(--dash-card)", fontSize: 10, color: "var(--dash-text-muted)" }}>{f}</span>
                  ))}
                </div>
              </div>
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,.json,.txt" style={{ display: "none" }}
                onChange={(e) => handleImportFile(e.target.files?.[0])} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--dash-card-hover)" }} />
                <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>ou cole o cardápio</span>
                <div style={{ flex: 1, height: 1, background: "var(--dash-card-hover)" }} />
              </div>

              <textarea
                placeholder="Cole aqui o cardápio copiado do iFood, site do concorrente, WhatsApp, etc..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                style={{
                  width: "100%", minHeight: 100, padding: 14, borderRadius: 14,
                  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)",
                  fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={inpFocus} onBlur={inpBlur}
              />
              {pastedText.trim() && (
                <button onClick={() => handleImportText(pastedText)} style={{
                  marginTop: 10, width: "100%", padding: 14, borderRadius: 14,
                  background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                  fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                }}>✨ Analisar com IA</button>
              )}
            </>
          )}

          {/* Processing */}
          {importStep === "processing" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
              <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 700 }}>Analisando seu cardápio...</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 8 }}>A IA está extraindo categorias, produtos e preços</div>
            </div>
          )}

          {/* Preview */}
          {importStep === "preview" && importData && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Revisar importação</div>
                <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginTop: 2 }}>
                  {importData.categories?.length} categorias · {importData.categories?.reduce((s: number, c: any) => s + (c.products?.length || 0), 0)} produtos
                </div>
              </div>

              {importData.categories?.map((cat: any, ci: number) => (
                <div key={ci} style={{
                  marginBottom: 12, padding: 14, borderRadius: 14,
                  background: "var(--dash-card)",
                  border: "1px solid var(--dash-border)",
                }}>
                  <input value={cat.name} onChange={(e) => {
                    const u = structuredClone(importData); u.categories[ci].name = e.target.value; setImportData(u);
                  }} style={{
                    width: "100%", padding: "8px 12px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
                    color: "var(--dash-text)", fontSize: 14, fontWeight: 700, outline: "none",
                    marginBottom: 8, boxSizing: "border-box" as const, fontFamily: "inherit",
                  }} />
                  {cat.products?.map((prod: any, pi: number) => (
                    <div key={pi} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 0", borderBottom: pi < cat.products.length - 1 ? "1px solid var(--dash-border)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input value={prod.name} onChange={(e) => {
                          const u = structuredClone(importData); u.categories[ci].products[pi].name = e.target.value; setImportData(u);
                        }} style={{ width: "100%", padding: "3px 6px", borderRadius: 6, background: "transparent", border: "none", color: "var(--dash-text)", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
                        <input value={prod.description || ""} onChange={(e) => {
                          const u = structuredClone(importData); u.categories[ci].products[pi].description = e.target.value; setImportData(u);
                        }} placeholder="Descrição..." style={{ width: "100%", padding: "2px 6px", borderRadius: 6, background: "transparent", border: "none", color: "var(--dash-text-muted)", fontSize: 11, outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <input type="number" value={prod.price} onChange={(e) => {
                        const u = structuredClone(importData); u.categories[ci].products[pi].price = parseFloat(e.target.value) || 0; setImportData(u);
                      }} style={{ width: 75, padding: "4px 8px", borderRadius: 6, background: "var(--dash-card)", border: "none", color: "var(--dash-accent)", fontSize: 13, fontWeight: 700, outline: "none", textAlign: "right" as const }} />
                      <button onClick={() => {
                        const u = structuredClone(importData); u.categories[ci].products.splice(pi, 1); setImportData(u);
                      }} style={{
                        width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                        background: "rgba(220,38,38,0.10)", color: "#ffffff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, transition: "all 0.2s",
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              ))}

              <button onClick={handleConfirmImport} disabled={importing} style={{
                width: "100%", padding: 14, borderRadius: 14, marginTop: 12,
                background: "var(--dash-accent-soft)", border: "none",
                color: "var(--dash-accent)", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                opacity: importing ? 0.5 : 1,
              }}>
                {importing ? "Importando..." : `✨ Importar ${importData.categories?.reduce((s: number, c: any) => s + (c.products?.length || 0), 0)} produtos`}
              </button>
            </>
          )}

          {/* Done */}
          {importStep === "done" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={{ color: "var(--dash-text)", fontSize: 18, fontWeight: 800 }}>Importação concluída!</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 8 }}>
                Seus produtos foram adicionados. Agora adicione fotos e vídeos.
              </div>
              <button onClick={() => { setImportStep("idle"); setImportData(null); setPastedText(""); router.refresh(); }} style={{
                marginTop: 20, padding: "12px 24px", borderRadius: 14,
                background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Voltar ao cardápio</button>
            </div>
          )}
        </div>
      )}

      {/* ── NORMAL CARDÁPIO VIEW ── */}
      {importStep === "idle" && (
        <>
        {/* Links rápidos */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {unit && (
            <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card)", color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600,
              boxShadow: "var(--dash-shadow)",
              textDecoration: "none",
            }}>
              Ver cardápio ↗
            </a>
          )}
          <button type="button" onClick={() => setImportStep("upload")} style={{
            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "var(--dash-purple-soft)", color: "var(--dash-purple)", fontSize: 12, fontWeight: 600,
            boxShadow: "0 1px 0 rgba(168,85,247,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
          }}>
            ✨ Importar com IA
          </button>
          {(restaurant?.plan === "menupro" || restaurant?.plan === "business") && (
            <button type="button" onClick={handleAISuggestion} disabled={generatingAISuggestion} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-purple-soft)", color: "var(--dash-purple)", fontSize: 12, fontWeight: 600,
              boxShadow: "0 1px 0 rgba(168,85,247,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              opacity: generatingAISuggestion ? 0.5 : 1,
            }}>
              {generatingAISuggestion ? "Analisando..." : "✨ Sugestão IA"}
            </button>
          )}
          {otherUnits.length > 0 && (
            <button type="button" onClick={() => setShowCopyFromUnit(true)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-info-soft)", color: "var(--dash-info)",
              fontSize: 12, fontWeight: 600,
              boxShadow: "0 1px 0 rgba(96,165,250,0.06) inset, 0 -1px 0 rgba(0,0,0,0.12) inset",
            }}>📋 Copiar de outra unidade</button>
          )}
        </div>

        {aiSuggestionResult && (
          <div style={{
            padding: 16, borderRadius: 14, background: "var(--dash-purple-soft)",
            boxShadow: "0 1px 0 rgba(168,85,247,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)" }}>✨ Sugestões da IA</div>
              <button onClick={() => setAiSuggestionResult(null)} style={{
                width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                background: "rgba(220,38,38,0.10)", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, transition: "all 0.2s",
              }}>✕</button>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--dash-text-secondary)", lineHeight: 1.7 }}>
              {aiSuggestionResult}
            </div>
          </div>
        )}

      {/* Copy from unit flow */}
      {showCopyFromUnit && (
        <div style={{ padding: "0 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Copiar cardápio de outra unidade</div>
            <button onClick={() => { setShowCopyFromUnit(false); setSourcePreview(null); setSelectedSourceUnit(""); }} style={{
              width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(220,38,38,0.12)", color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
            }}>✕</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--dash-text-muted)", display: "block", marginBottom: 6 }}>Selecione a unidade</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {otherUnits.map(u => (
                <button key={u.id} type="button" onClick={async () => {
                  setSelectedSourceUnit(u.id);
                  const supabase = createSupabaseClient();
                  const { data: cats } = await supabase
                    .from("categories")
                    .select("id, name, order_index")
                    .eq("unit_id", u.id)
                    .eq("is_active", true)
                    .order("order_index");

                  let totalProducts = 0;
                  const catPreviews: any[] = [];
                  for (const cat of cats || []) {
                    const { count } = await supabase
                      .from("products")
                      .select("id", { count: "exact", head: true })
                      .eq("category_id", cat.id)
                      .eq("is_active", true);
                    catPreviews.push({ ...cat, productCount: count || 0 });
                    totalProducts += count || 0;
                  }
                  setSourcePreview({ categories: catPreviews, totalProducts });
                }} style={{
                  padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: selectedSourceUnit === u.id ? "var(--dash-info-soft)" : "var(--dash-card)",
                  color: selectedSourceUnit === u.id ? "var(--dash-info)" : "var(--dash-text-secondary)",
                  fontSize: 13, fontWeight: 600,
                  boxShadow: "var(--dash-shadow)",
                }}>{u.name}</button>
              ))}
            </div>
          </div>

          {sourcePreview && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 8 }}>
                {sourcePreview.categories.length} categorias · {sourcePreview.totalProducts} produtos
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sourcePreview.categories.map((cat: any) => (
                  <div key={cat.id} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 10, background: "var(--dash-card)",
                  }}>
                    <span style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>{cat.productCount} produtos</span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "var(--dash-warning-soft)", marginTop: 12,
                fontSize: 11, color: "var(--dash-warning)",
              }}>
                ⚠️ Isso vai ADICIONAR categorias e produtos à unidade atual. Produtos existentes não serão alterados.
                Fotos e vídeos NÃO são copiados — precisam ser adicionados depois.
              </div>

              <button onClick={handleCopyFromUnit} disabled={copying} style={{
                width: "100%", padding: 14, borderRadius: 14, marginTop: 12,
                background: "var(--dash-accent-soft)", border: "none",
                color: "var(--dash-accent)", fontSize: 14, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                opacity: copying ? 0.5 : 1,
              }}>
                {copying ? "Copiando..." : `📋 Copiar ${sourcePreview.totalProducts} produtos`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nova categoria */}
      {unit && (
        <form action={createCategory} className="modal-neon-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)" }}>
          <input type="hidden" name="unit_id" value={unit.id} />
          <input type="hidden" name="category_type" value={newCatType} />
          <input type="hidden" name="is_alcoholic" value="false" />
          <input type="hidden" name="section" value={newCatSection} />
          <div style={{ display: "flex", gap: 8 }}>
            <input name="name" placeholder="Nome da categoria" required style={{ ...inp, flex: 1, height: 38, padding: "0 12px" }} onFocus={inpFocus} onBlur={inpBlur} />
            <button type="submit" style={{
              padding: "0 14px", whiteSpace: "nowrap", minWidth: 60, height: 38, borderRadius: 8,
              border: "none", cursor: "pointer",
              background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
              fontSize: 12, fontWeight: 700,
              boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              Criar
            </button>
          </div>
          {/* Sessão */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: "var(--dash-text-dim)", marginBottom: 8 }}>Sessão</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allSections.map((s) => {
                const isActive = newCatSection === s.value;
                return (
                  <button key={s.value} type="button" onClick={() => setNewCatSection(s.value)}
                    style={{
                      padding: "5px 14px", borderRadius: 8, border: "none",
                      background: isActive ? "var(--dash-accent-soft)" : "var(--dash-card)",
                      color: isActive ? "var(--dash-accent)" : "var(--dash-text-muted)",
                      cursor: "pointer", fontSize: 11, fontWeight: 600,
                      transition: "all 0.15s",
                      boxShadow: isActive ? "none" : "var(--dash-shadow)",
                    }}>
                    {s.icon} {s.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowCreateSection(v => !v)}
                style={{ padding: "6px 16px", borderRadius: 10, border: "1px dashed var(--dash-text-subtle)", background: "transparent", color: "var(--dash-text-muted)", cursor: "pointer", fontSize: 12, transition: "all 0.3s" }}>
                + Criar sessão
              </button>
            </div>
            {showCreateSection && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: "var(--dash-card)", border: "1px solid var(--dash-border)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Nome da sessão" value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-card-hover)", color: "var(--dash-text)", fontSize: 13, outline: "none" }}
                    onFocus={inpFocus} onBlur={inpBlur} />
                  <input type="text" placeholder="🗂" value={newSectionIcon} onChange={e => setNewSectionIcon(e.target.value)} maxLength={2}
                    style={{ width: 50, padding: "8px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-card-hover)", color: "var(--dash-text)", fontSize: 18, textAlign: "center", outline: "none" }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--dash-text-dim)", fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={newSectionVideo} onChange={e => setNewSectionVideo(e.target.checked)} style={{ accentColor: "var(--dash-accent)" }} />
                    Permite vídeo
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--dash-text-dim)", fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={newSectionAlcoholic} onChange={e => setNewSectionAlcoholic(e.target.checked)} style={{ accentColor: "var(--dash-accent)" }} />
                    Toggle alcoólico
                  </label>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => setShowCreateSection(false)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                  <button type="button" onClick={handleCreateSection}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>Criar</button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {orderedCats.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dash-text-subtle)", fontSize: 14 }}>Crie sua primeira categoria acima!</div>
      )}

      {orderedCats.map((cat, catIdx) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];
        const isDragging = dragIdx === catIdx;
        const isOver = overIdx === catIdx;
        return (
          <div
            key={cat.id}
            data-cat-idx={catIdx}
            draggable
            onDragStart={() => setDragIdx(catIdx)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(catIdx); }}
            onDragEnd={() => { if (dragIdx !== null && overIdx !== null) handleReorder(dragIdx, overIdx); setDragIdx(null); setOverIdx(null); }}
            onDrop={() => { if (dragIdx !== null) handleReorder(dragIdx, catIdx); setDragIdx(null); setOverIdx(null); }}
            style={{
              borderRadius: 14,
              border: overIdx === catIdx ? "2px solid #FF6B00" : "none",
              background: "transparent",
              overflow: "hidden",
              opacity: dragIdx === catIdx ? 0.7 : 1,
              transition: "all 0.2s ease",
              transform: overIdx === catIdx && dragIdx !== catIdx ? "scale(1.02)" : "none",
              marginBottom: 6,
            }}
          >
            {/* COLLAPSED HEADER */}
            {!isOpen && (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 14,
                  background: "var(--dash-card)",
                  boxShadow: "var(--dash-shadow)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setExpandedCat(cat.id);
                  setEditScheduleEnabled(cat.schedule_enabled || false);
                  setEditDays((cat.available_days as string[]) || ["seg","ter","qua","qui","sex","sab","dom"]);
                  setEditStartTime(cat.start_time?.slice(0,5) || "11:00");
                  setEditEndTime(cat.end_time?.slice(0,5) || "23:00");
                }}
              >
                <span
                  style={{ color: "var(--dash-text-subtle)", cursor: "grab", fontSize: 14, userSelect: "none", WebkitUserSelect: "none", touchAction: "none", flexShrink: 0 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={(e) => { e.preventDefault(); onTouchStartDrag(e, catIdx); }}
                  onTouchMove={(e) => onTouchMoveDrag(e)}
                  onTouchEnd={() => onTouchEndDrag()}
                  title="Segurar e arrastar para reordenar"
                >⠿</span>
                <span style={{ color: "var(--dash-text-muted)", fontSize: 10, flexShrink: 0 }}>▼</span>
                <span style={{ flex: 1, color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>{cat.name}</span>
                {cat.schedule_enabled && (
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "var(--dash-warning-soft)", color: "var(--dash-warning)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    🕐 {cat.start_time?.slice(0,5)}-{cat.end_time?.slice(0,5)}
                  </span>
                )}
                <label className="switch-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isCatActive(cat)}
                    onChange={async (e) => {
                      const newActive = e.target.checked;
                      setCatActiveState(prev => ({ ...prev, [cat.id]: newActive }));
                      const supabase = createSupabaseClient();
                      const { error } = await supabase.from("categories").update({ is_active: newActive }).eq("id", cat.id);
                      if (error) { console.error("Toggle category active error:", error); setCatActiveState(prev => ({ ...prev, [cat.id]: !newActive })); }
                    }}
                  />
                  <div className="sw-slider">
                    <div className="sw-circle">
                      <svg className="sw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <svg className="sw-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* EXPANDED FORM */}
            {isOpen && (
              <div style={{
                borderRadius: 14,
                background: "var(--dash-accent-soft)",
                border: "1px solid rgba(0,255,174,0.06)",
                overflow: "hidden",
              }}>
              <form action={updateCategory} style={{ padding: "16px" }}>
                <input type="hidden" name="id" value={cat.id} />
                <input type="hidden" name="section" value={editCatSection[cat.id] ?? cat.section ?? 'pratos'} />
                <input type="hidden" name="schedule_enabled" value={String(editScheduleEnabled)} />
                <input type="hidden" name="available_days" value={JSON.stringify(editDays)} />
                <input type="hidden" name="start_time" value={editStartTime} />
                <input type="hidden" name="end_time" value={editEndTime} />

                {/* Row 1: Name + Salvar + X + Toggle */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <input name="name" defaultValue={cat.name} style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "none",
                    color: "var(--dash-text)", fontSize: 14, fontWeight: 700, outline: "none",
                  }} />
                  <button type="submit" style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                    fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap",
                    boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                  }}>Salvar</button>
                  {/* Cancel edit */}
                  <button type="button" onClick={() => { setExpandedCat(null); setShowAllProducts(prev => ({ ...prev, [cat.id]: false })); }} style={{
                    width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                    background: "rgba(220,38,38,0.12)", color: "#ffffff",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                    transition: "all 0.2s",
                  }}>✕</button>
                  {/* Active toggle */}
                  <label className="switch-toggle" style={{ flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={isCatActive(cat)}
                      onChange={async (e) => {
                        const newActive = e.target.checked;
                        setCatActiveState(prev => ({ ...prev, [cat.id]: newActive }));
                        const supabase = createSupabaseClient();
                        const { error } = await supabase.from("categories").update({ is_active: newActive }).eq("id", cat.id);
                        if (error) { console.error("Toggle category active error:", error); setCatActiveState(prev => ({ ...prev, [cat.id]: !newActive })); }
                      }}
                    />
                    <div className="sw-slider">
                      <div className="sw-circle">
                        <svg className="sw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <svg className="sw-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Row 2: Drag + Arrow + Session */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span
                    style={{ color: "var(--dash-text-subtle)", cursor: "grab", fontSize: 14, userSelect: "none", WebkitUserSelect: "none", touchAction: "none", flexShrink: 0 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={(e) => { e.preventDefault(); onTouchStartDrag(e, catIdx); }}
                    onTouchMove={(e) => onTouchMoveDrag(e)}
                    onTouchEnd={() => onTouchEndDrag()}
                    title="Segurar e arrastar para reordenar"
                  >⠿</span>
                  <span style={{ color: "var(--dash-text-muted)", fontSize: 10, flexShrink: 0 }}>▲</span>
                  <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--dash-text-muted)", lineHeight: "24px", flexShrink: 0 }}>Sessão:</span>
                    {allSections.map(s => {
                      const current = editCatSection[cat.id] ?? cat.section ?? 'pratos';
                      const isActive = current === s.value;
                      return (
                        <button key={s.value} type="button" onClick={() => setEditCatSection(prev => ({ ...prev, [cat.id]: s.value }))}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                            background: isActive ? "var(--dash-accent-soft)" : "var(--dash-card)",
                            color: isActive ? "var(--dash-accent)" : "var(--dash-text-muted)",
                            fontSize: 10, fontWeight: 600,
                          }}>{s.label}</button>
                      );
                    })}
                    <button type="button" onClick={() => setShowCreateSection(v => !v)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px dashed var(--dash-border)", background: "transparent", color: "var(--dash-text-subtle)", cursor: "pointer", fontSize: 10, whiteSpace: "nowrap" }}>
                      + Criar
                    </button>
                  </div>
                </div>

                {/* Row 3: Ativar por horário */}
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={editScheduleEnabled} onChange={e => setEditScheduleEnabled(e.target.checked)}
                      style={{ accentColor: "var(--dash-accent)", width: 14, height: 14 }} />
                    <span style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>Ativar por horário</span>
                  </label>
                  {editScheduleEnabled && (
                    <div style={{ marginTop: 8, paddingLeft: 20 }}>
                      <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>
                        {["seg","ter","qua","qui","sex","sab","dom"].map(day => (
                          <button key={day} type="button" onClick={() => setEditDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                            style={{
                              padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer",
                              background: editDays.includes(day) ? "var(--dash-accent-soft)" : "var(--dash-card)",
                              color: editDays.includes(day) ? "var(--dash-accent)" : "var(--dash-text-subtle)",
                              fontSize: 9, fontWeight: 600,
                            }}>{day}</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)}
                          style={{ padding: "3px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 11, outline: "none" }} />
                        <span style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>até</span>
                        <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)}
                          style={{ padding: "3px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 11, outline: "none" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "var(--dash-text-subtle)", marginTop: 4 }}>
                        Categoria visível apenas nos dias e horários selecionados.
                      </div>
                    </div>
                  )}
                </div>
              </form>
              {/* Row 6: Excluir categoria — separate form (no nesting), visually inside section */}
              <div style={{ paddingInline: 16, paddingBottom: 12, paddingTop: 10, borderTop: "1px solid var(--dash-section-border)", display: "flex", justifyContent: "flex-end" }}>
                <form action={deleteCategory} onSubmit={(e) => { if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={cat.id} />
                  <button type="submit" style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--dash-danger)", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                  }}>Excluir categoria</button>
                </form>
              </div>
              </div>
            )}
            <div className="cat-dropdown-content" data-open={isOpen ? "true" : "false"}>
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: isOpen ? "0 12px 12px" : "0 12px" }}>
                  {isOpen && (
                    <>
                      {catProducts.length === 0 && <div style={{ color: "var(--dash-text-subtle)", fontSize: 13, padding: "8px 0" }}>Nenhum produto nesta categoria.</div>}
                      {(showAllProducts[cat.id] ? catProducts : catProducts.slice(0, 4)).map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          expanded={expandedProductId === p.id}
                          onToggle={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                          onClose={() => setExpandedProductId(null)}
                          section={editCatSection[cat.id] ?? cat.section ?? 'pratos'}
                          customSections={customSections}
                          unitId={unit?.id}
                          hasRecipeFeature={hasRecipeFeature}
                        />
                      ))}
                      {catProducts.length > 4 && !showAllProducts[cat.id] && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowAllProducts(prev => ({ ...prev, [cat.id]: true })); }}
                          style={{
                            width: "100%",
                            padding: "10px 0",
                            background: "var(--dash-card)",
                            border: "1px solid var(--dash-border)",
                            borderRadius: 8,
                            color: "var(--dash-accent)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Ver mais {catProducts.length - 4} produto{catProducts.length - 4 !== 1 ? "s" : ""} ↓
                        </button>
                      )}
                      <NewProductFormInline
                        categoryId={cat.id}
                        section={editCatSection[cat.id] ?? cat.section ?? 'pratos'}
                        customSections={customSections}
                        anyProductExpanded={expandedProductId !== null}
                        onOpen={() => setExpandedProductId(null)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}
