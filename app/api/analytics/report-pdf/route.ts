import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const fmtBRL = (v: number) =>
      `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    function addSubtitle(text: string) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(text, margin, y);
      y += 7;
    }

    function addText(text: string, size = 10) {
      doc.setFontSize(size);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.5) + 3;
    }

    function addMetric(label: string, value: string, x: number, w: number) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, y, w, 18, 3, 3, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 100);
      doc.text(value, x + w / 2, y + 8, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(label, x + w / 2, y + 14, { align: "center" });
    }

    function checkPage() {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    }

    // ── HEADER ──
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("FyMenu", margin, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(
      `Relatório de Analytics — ${body.unitName || "Restaurante"}`,
      margin,
      22
    );
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} · Período: ${body.period || "Geral"}`,
      margin,
      28
    );
    y = 45;

    // ── MÉTRICAS PRINCIPAIS ──
    addSubtitle("Métricas Principais");
    y += 2;

    const metricW = (contentWidth - 9) / 4;
    addMetric("Visualizações", String(body.stats?.views || 0), margin, metricW);
    addMetric("Cliques", String(body.stats?.clicks || 0), margin + metricW + 3, metricW);
    addMetric("Pedidos", String(body.stats?.orders || 0), margin + (metricW + 3) * 2, metricW);
    addMetric(
      "Conversão",
      `${body.stats?.conversionRate || 0}%`,
      margin + (metricW + 3) * 3,
      metricW
    );
    y += 24;

    // ── RECEITA ──
    checkPage();
    addSubtitle("Receita");
    y += 2;

    const revenueW = (contentWidth - 6) / 3;
    addMetric("Total", fmtBRL(body.revenueData?.total || 0), margin, revenueW);
    addMetric(
      "Ticket Médio",
      fmtBRL(body.revenueData?.ticketMedio || 0),
      margin + revenueW + 3,
      revenueW
    );
    addMetric(
      "WhatsApp",
      fmtBRL(body.revenueData?.bySource?.whatsapp || 0),
      margin + (revenueW + 3) * 2,
      revenueW
    );
    y += 24;

    // ── TOP PRODUTOS ──
    checkPage();
    addSubtitle("Top Produtos (mais clicados)");
    y += 2;

    if (body.topProducts?.length > 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("#", margin + 3, y + 5);
      doc.text("Produto", margin + 12, y + 5);
      doc.text("Cliques", margin + contentWidth - 20, y + 5, { align: "right" });
      y += 9;

      for (let i = 0; i < Math.min(body.topProducts.length, 10); i++) {
        const p = body.topProducts[i];
        checkPage();
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 3, contentWidth, 7, "F");
        }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(String(i + 1), margin + 3, y + 2);
        doc.text(String(p.name || "?").slice(0, 40), margin + 12, y + 2);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 150, 100);
        doc.text(String(p.count || 0), margin + contentWidth - 20, y + 2, { align: "right" });
        y += 7;
      }
    } else {
      addText("Nenhum dado de produto disponível.");
    }
    y += 5;

    // ── ATTENTION TIME ──
    if (body.attentionRanking?.length > 0) {
      checkPage();
      addSubtitle("Product Attention Time");
      y += 2;

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("#", margin + 3, y + 5);
      doc.text("Produto", margin + 12, y + 5);
      doc.text("Tempo médio", margin + contentWidth - 30, y + 5, { align: "right" });
      doc.text("Views", margin + contentWidth - 8, y + 5, { align: "right" });
      y += 9;

      for (let i = 0; i < Math.min(body.attentionRanking.length, 10); i++) {
        const p = body.attentionRanking[i];
        checkPage();
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y - 3, contentWidth, 7, "F");
        }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(String(i + 1), margin + 3, y + 2);
        doc.text(String(p.name || "?").slice(0, 35), margin + 12, y + 2);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 150, 100);
        doc.text(`${p.avgSeconds || 0}s`, margin + contentWidth - 30, y + 2, { align: "right" });
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(String(p.totalViews || 0), margin + contentWidth - 8, y + 2, { align: "right" });
        y += 7;
      }
      y += 5;
    }

    // ── FOOTER ──
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text(
        `FyMenu · ${body.unitName || ""} · ${new Date().toLocaleDateString("pt-BR")} · Página ${i}/${totalPages}`,
        pageWidth / 2,
        290,
        { align: "center" }
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-analytics-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
