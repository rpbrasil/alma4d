"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Filter,
  ChevronRight,
  Search,
  X,
  FileText,
  CalendarRange,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

import type { jsPDF as JsPDFClass } from "jspdf";

type JsPDFWithAutoTable = JsPDFClass & {
  lastAutoTable?: {
    finalY?: number;
  };
};

type PdfImage = {
  dataUrl: string;
  width: number;
  height: number;
};

type Denuncia = {
  id: string;
  protocolo: string;
  cliente_id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  status: string;
  risco_iminente: boolean;
  created_at: string;
  data_ocorrencia: string | null;
  local_ocorrencia: string | null;
  contato_retorno: string | null;
  anonimizada: boolean;
  severidade: string | null;
  prioridade: string | null;
};

type DenunciaArquivo = {
  id: string;
  denuncia_id: string;
  nome_original: string | null;
  mime_type: string;
  tamanho_bytes: number;
  storage_path: string;
  bucket: string;
  created_at: string;
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const blob = await res.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addSectionTitle(doc: JsPDFClass, title: string, y: number) {
  doc.setFillColor(1, 148, 153); // #019499
  doc.roundedRect(14, y - 5, 182, 9, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title, 18, y + 1);
}

function addImageKeepRatio(
  doc: JsPDFClass,
  base64: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const img = new Image();
  img.src = base64;

  const imgWidth = img.naturalWidth || 100;
  const imgHeight = img.naturalHeight || 100;

  const ratio = imgWidth / imgHeight;

  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  doc.addImage(base64, "PNG", x, y, width, height);
}

function addFooter(
  doc: JsPDFClass,
  pageNumber: number,
  almaLogoBase64?: string | null,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

  // ✅ LOGO SEM DISTORÇÃO
  if (almaLogoBase64) {
    addImageKeepRatio(
      doc,
      almaLogoBase64,
      14, // X
      pageHeight - 12, // Y
      12, // largura máxima
      6, // altura máxima
    );
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  doc.text("Relatório executivo", 30, pageHeight - 6);
  doc.text(`Página ${pageNumber}`, pageWidth - 28, pageHeight - 6);
}

const STATUS_LABELS: Record<string, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  procedente: "Procedente",
  improcedente: "Improcedente",
  encerrada: "Encerrada",
};

const STATUS_STYLES: Record<string, string> = {
  recebida: "bg-gray-100 text-gray-700",
  em_analise: "bg-blue-100 text-blue-700",
  procedente: "bg-green-100 text-green-700",
  improcedente: "bg-orange-100 text-orange-700",
  encerrada: "bg-slate-200 text-slate-700",
};

const PIE_COLORS = [
  "#030870", // brand
  "#019499", // secondary
  "#df633f", // accent
  "#6126e2", // highlight
  "#1e293b", // neutro escuro
  "#94a3b8", // neutro claro
];

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function monthKey(date: string) {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${month}/${year}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function KpiCard({
  title,
  value,
  danger,
}: {
  title: string;
  value: number | string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger ? "border-[#df633f] bg-[#df633f]/10" : "border-border bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{title}</p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          danger ? "text-[#df633f]" : "text-[#030870]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function RelatorioOcorrenciasPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { role } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [arquivos, setArquivos] = useState<DenunciaArquivo[]>([]);
  const [selected, setSelected] = useState<Denuncia | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [openFilters, setOpenFilters] = useState(false);
  // filtros
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [riscoFilter, setRiscoFilter] = useState<"todos" | "sim" | "nao">(
    "todos",
  );
  const [anonFilter, setAnonFilter] = useState<
    "todos" | "anonimo" | "identificado"
  >("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const categoryChartRef = useRef<HTMLDivElement | null>(null);
  const statusChartRef = useRef<HTMLDivElement | null>(null);
  const timelineChartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (role && role !== "admin" && role !== "cliente") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  useEffect(() => {
    if (!role || (role !== "admin" && role !== "cliente")) return;

    async function load() {
      setLoading(true);

      try {
        const [
          { data: denunciasData, error: denunciasError },
          { data: arquivosData, error: arquivosError },
        ] = await Promise.all([
          supabase
            .from("denuncias")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("denuncias_arquivos")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (denunciasError) {
          console.error("Erro ao carregar denúncias:", denunciasError);
        }

        if (arquivosError) {
          console.error("Erro ao carregar arquivos:", arquivosError);
        }

        setDenuncias((denunciasData as Denuncia[]) || []);
        setArquivos((arquivosData as DenunciaArquivo[]) || []);

        // tenta descobrir o cliente atual via sessão -> usuarios -> clientes
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const uid = session?.user?.id;

        if (uid) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("cliente_id")
            .eq("id", uid)
            .maybeSingle();

          if (usuario?.cliente_id) {
            const { data: cliente } = await supabase
              .from("clientes")
              .select("nome")
              .eq("id", usuario.cliente_id)
              .maybeSingle();

            setClienteNome(cliente?.nome ?? null);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase, role]);

  const categorias = useMemo(() => {
    return Array.from(new Set(denuncias.map((d) => d.categoria))).sort();
  }, [denuncias]);

  const filteredDenuncias = useMemo(() => {
    return denuncias.filter((d) => {
      const text =
        `${d.protocolo} ${d.titulo} ${d.descricao} ${d.categoria}`.toLowerCase();
      const matchesSearch =
        !search.trim() || text.includes(search.toLowerCase());

      const matchesCategoria =
        categoriaFilter === "todas" || d.categoria === categoriaFilter;

      const matchesStatus =
        statusFilter === "todos" || d.status === statusFilter;

      const matchesRisco =
        riscoFilter === "todos" ||
        (riscoFilter === "sim" && d.risco_iminente) ||
        (riscoFilter === "nao" && !d.risco_iminente);

      const matchesAnon =
        anonFilter === "todos" ||
        (anonFilter === "anonimo" && d.anonimizada) ||
        (anonFilter === "identificado" && !d.anonimizada);

      const created = new Date(d.created_at).toISOString().slice(0, 10);

      const matchesDateFrom = !dateFrom || created >= dateFrom;
      const matchesDateTo = !dateTo || created <= dateTo;

      return (
        matchesSearch &&
        matchesCategoria &&
        matchesStatus &&
        matchesRisco &&
        matchesAnon &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [
    denuncias,
    search,
    categoriaFilter,
    statusFilter,
    riscoFilter,
    anonFilter,
    dateFrom,
    dateTo,
  ]);

  const stats = useMemo(() => {
    const total = filteredDenuncias.length;
    const emAnalise = filteredDenuncias.filter(
      (d) => d.status === "em_analise",
    ).length;
    const risco = filteredDenuncias.filter((d) => d.risco_iminente).length;
    const encerradas = filteredDenuncias.filter(
      (d) => d.status === "encerrada",
    ).length;

    return { total, emAnalise, risco, encerradas };
  }, [filteredDenuncias]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of filteredDenuncias) {
      map.set(d.categoria, (map.get(d.categoria) || 0) + 1);
    }

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredDenuncias]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of filteredDenuncias) {
      map.set(d.status, (map.get(d.status) || 0) + 1);
    }

    return Array.from(map.entries()).map(([status, total]) => ({
      status: STATUS_LABELS[status] || status,
      total,
    }));
  }, [filteredDenuncias]);

  const timelineData = useMemo(() => {
    const map = new Map<string, number>();

    for (const d of filteredDenuncias) {
      const key = monthKey(d.created_at);
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: monthLabel(month),
        total,
      }));
  }, [filteredDenuncias]);

  const selectedArquivos = useMemo(() => {
    if (!selected) return [];
    return arquivos.filter((a) => a.denuncia_id === selected.id);
  }, [selected, arquivos]);

  useEffect(() => {
    if (!selectedArquivos.length) return;

    (async () => {
      const entries: Record<string, string> = {};

      for (const arquivo of selectedArquivos) {
        try {
          const res = await fetch("/api/arquivos/signed-url", {
            method: "POST",
            body: JSON.stringify({
              path: arquivo.storage_path,
            }),
          });

          const data = await res.json();

          if (data?.url) {
            entries[arquivo.id] = data.url;
          }
        } catch (e) {
          console.error("Erro ao gerar URL", e);
        }
      }
      setFileUrls(entries);
    })();
  }, [selectedArquivos]);

  function addExecutiveHeader(
    doc: JsPDFClass,
    options: {
      title: string;
      subtitle: string;
      companyName?: string | null;
      companyLogoBase64?: string | null;
    },
  ) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // fundo sutil
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 50, "F");

    // título
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.text(options.title, 14, 20);

    // subtítulo
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 14, 26);

    // empresa
    if (options.companyName) {
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Empresa: ${options.companyName}`, 14, 34);
    }

    // logo cliente (direita)
    if (options.companyLogoBase64) {
      addImageKeepRatio(
        doc,
        options.companyLogoBase64,
        pageWidth - 40,
        12,
        26,
        20,
      );
    }
  }

  async function captureChart(
    ref: React.RefObject<HTMLDivElement | null>,
  ): Promise<PdfImage | null> {
    if (!ref.current) return null;

    const html2canvas = (await import("html2canvas-pro")).default;

    await new Promise((resolve) => setTimeout(resolve, 120));

    const canvas = await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
    });

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  }

  async function exportPdf() {
    try {
      setExportingPdf(true);

      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pdfDoc = doc as JsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageContentWidth = pageWidth - 28;
      let pageNumber = 1;

      const almaLogoBase64 = await loadImageAsBase64(
        "/images/alma4d-round-512.png",
      );

      // Se no futuro você tiver logo da empresa, substitua aqui:
      const companyLogoBase64: string | null = null;

      const reportTitle = "Relatório de Riscos e Ocorrências";
      const reportSubtitle = `Emitido em ${new Date().toLocaleString("pt-BR")}`;

      addExecutiveHeader(doc, {
        title: reportTitle,
        subtitle: reportSubtitle,
        companyName: clienteNome ?? undefined,

        companyLogoBase64,
      });

      addSectionTitle(doc, "Filtros aplicados", 50);

      const filtersSummary = [
        `Busca: ${search || "—"}`,
        `Categoria: ${categoriaFilter}`,
        `Status: ${statusFilter}`,
        `Risco iminente: ${riscoFilter}`,
        `Anonimato: ${anonFilter}`,
        `Período: ${dateFrom || "—"} até ${dateTo || "—"}`,
      ];

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      filtersSummary.forEach((item, idx) => {
        doc.text(`• ${item}`, 18, 59 + idx * 5);
      });

      autoTable(doc, {
        startY: 92,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total de ocorrências", String(stats.total)],
          ["Em análise", String(stats.emAnalise)],
          ["Risco iminente", String(stats.risco)],
          ["Encerradas", String(stats.encerradas)],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: {
          fillColor: [3, 8, 112],
          textColor: [255, 255, 255],
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      let currentY = (pdfDoc.lastAutoTable?.finalY ?? 100) + 10;

      const chartImages = await Promise.all([
        captureChart(categoryChartRef),
        captureChart(statusChartRef),
        captureChart(timelineChartRef),
      ]);

      const chartTitles = [
        "Distribuição por categoria",
        "Ocorrências por status",
        "Linha do tempo das ocorrências",
      ];

      for (let i = 0; i < chartImages.length; i++) {
        const img = chartImages[i];
        if (!img) continue;

        const ratio = img.height / img.width;
        const targetWidth = pageContentWidth;
        const targetHeight = targetWidth * ratio;

        const requiredSpace = 10 + targetHeight + 10;

        if (currentY + requiredSpace > pageHeight - 20) {
          addFooter(doc, pageNumber, almaLogoBase64);
          doc.addPage();
          pageNumber += 1;

          addExecutiveHeader(doc, {
            title: reportTitle,
            subtitle: reportSubtitle,
            companyName: clienteNome ?? undefined,

            companyLogoBase64,
          });

          currentY = 54;
        }

        addSectionTitle(doc, chartTitles[i], currentY);
        currentY += 8;

        doc.addImage(
          img.dataUrl,
          "PNG",
          14,
          currentY,
          targetWidth,
          targetHeight,
        );

        currentY += targetHeight + 10;
      }

      if (currentY > pageHeight - 80) {
        addFooter(doc, pageNumber, almaLogoBase64);
        doc.addPage();
        pageNumber += 1;

        addExecutiveHeader(doc, {
          title: reportTitle,
          subtitle: reportSubtitle,
          companyName: clienteNome ?? undefined,

          companyLogoBase64,
        });

        currentY = 54;
      }

      addSectionTitle(doc, "Ocorrências filtradas", currentY);
      currentY += 10;

      autoTable(doc, {
        startY: currentY,
        head: [["Protocolo", "Categoria", "Status", "Risco", "Data"]],
        body: filteredDenuncias.map((d) => [
          d.protocolo,
          d.categoria,
          STATUS_LABELS[d.status] || d.status,
          d.risco_iminente ? "Sim" : "Não",
          formatDate(d.created_at),
        ]),
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: {
          fillColor: [1, 148, 153],
          textColor: [255, 255, 255],
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      addFooter(doc, pageNumber, almaLogoBase64);

      doc.save("relatorio-riscos-ocorrencias-executivo.pdf");
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando relatório...</div>;
  }

  function resetFilters() {
    setSearch("");
    setCategoriaFilter("todas");
    setStatusFilter("todos");
    setRiscoFilter("todos");
    setAnonFilter("todos");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Relatório de Riscos e Ocorrências
          </h1>
          <p className="text-sm text-slate-600">
            Visualize indicadores, distribuições, histórico e detalhes das
            ocorrências registradas.
          </p>
        </div>

        <button
          onClick={exportPdf}
          disabled={exportingPdf}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-white font-medium hover:opacity-95 disabled:opacity-50"
        >
          <Download size={18} />
          {exportingPdf ? "Exportando PDF..." : "Exportar PDF"}
        </button>
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-4">
        {/* Header accordion */}
        <button
          type="button"
          onClick={() => setOpenFilters((prev) => !prev)}
          className="w-full flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium bg-surface hover:bg-surface-muted transition"
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <span className="text-slate-900">Filtros avançados</span>
          </div>

          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              openFilters ? "rotate-90" : ""
            }`}
          />
        </button>

        {/* Conteúdo com animação suave */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            openFilters ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"
          }`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 border-t pt-4">
            {/* Busca */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Busca</label>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Protocolo, título, descrição..."
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Categoria</label>
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="todas">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="recebida">Recebida</option>
                <option value="em_analise">Em análise</option>
                <option value="procedente">Procedente</option>
                <option value="improcedente">Improcedente</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </div>

            {/* Risco */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Risco iminente</label>
              <select
                value={riscoFilter}
                onChange={(e) =>
                  setRiscoFilter(e.target.value as "todos" | "sim" | "nao")
                }
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="sim">Somente com risco</option>
                <option value="nao">Sem risco</option>
              </select>
            </div>

            {/* Tipo de envio */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Tipo de envio</label>
              <select
                value={anonFilter}
                onChange={(e) =>
                  setAnonFilter(
                    e.target.value as "todos" | "anonimo" | "identificado",
                  )
                }
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="anonimo">Somente anônimos</option>
                <option value="identificado">Somente identificados</option>
              </select>
            </div>

            {/* Data inicial */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Data inicial</label>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <CalendarRange size={16} className="text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>

            {/* Data final */}
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Data final</label>
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <CalendarRange size={16} className="text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Botão limpar */}
          <div className="flex justify-end pt-4">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <X size={16} />
              Limpar filtros
            </button>
          </div>
        </div>
      </section>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total de ocorrências" value={stats.total} />
        <KpiCard title="Em análise" value={stats.emAnalise} />
        <KpiCard title="Risco iminente" value={stats.risco} danger />
        <KpiCard title="Encerradas" value={stats.encerradas} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div
          ref={categoryChartRef}
          className="rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={18} className="text-slate-500" />
            <h2 className="font-medium text-slate-900">
              Distribuição por categoria
            </h2>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  label
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          ref={statusChartRef}
          className="rounded-2xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-slate-500" />
            <h2 className="font-medium text-slate-900">
              Ocorrências por status
            </h2>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#030870" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          ref={timelineChartRef}
          className="rounded-2xl border border-border bg-white p-4 shadow-sm xl:col-span-2"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-slate-500" />
            <h2 className="font-medium text-slate-900">
              Linha do tempo das ocorrências
            </h2>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#019499"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <section className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="font-medium text-slate-900">Ocorrências filtradas</h2>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">Protocolo</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Status</th>
                <th className="p-3">Risco</th>
                <th className="p-3">Data</th>
                <th className="p-3">Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredDenuncias.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.protocolo}</td>
                  <td className="p-3">{d.categoria}</td>
                  <td className="p-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="p-3">
                    {d.risco_iminente ? (
                      <span className="inline-flex items-center gap-1 text-[#df633f] font-medium">
                        <AlertTriangle size={14} />
                        Alto
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3">{formatDate(d.created_at)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelected(d)}
                      className="inline-flex items-center gap-1 text-[#019499] font-medium hover:underline"
                    >
                      <Eye size={16} />
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDenuncias.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhuma ocorrência encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Detalhe da ocorrência
              </h2>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Protocolo</p>
                <p className="font-medium">{selected.protocolo}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={selected.status} />
              </div>

              <div>
                <p className="text-xs text-slate-500">Categoria</p>
                <p>{selected.categoria}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Data do registro</p>
                <p>{formatDateTime(selected.created_at)}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Data da ocorrência</p>
                <p>{formatDate(selected.data_ocorrencia)}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Local</p>
                <p>{selected.local_ocorrencia || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Tipo de envio</p>
                <p>{selected.anonimizada ? "Anônimo" : "Identificado"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Contato de retorno</p>
                <p>{selected.contato_retorno || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Severidade</p>
                <p>{selected.severidade || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Prioridade</p>
                <p>{selected.prioridade || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Título</p>
              <p className="font-medium">{selected.titulo}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Descrição</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selected.descricao}
              </p>
            </div>

            {selected.risco_iminente && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 font-medium">
                ⚠️ Risco iminente identificado
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2">Arquivos anexados</p>

              {selectedArquivos.length > 0 ? (
                <div className="space-y-2">
                  {selectedArquivos.map((arquivo) => {
                    const url = fileUrls[arquivo.id];

                    return (
                      <a
                        key={arquivo.id}
                        href={url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted transition"
                      >
                        <p className="font-medium text-brand underline">
                          {arquivo.nome_original || "(sem nome original)"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {arquivo.mime_type} •{" "}
                          {formatBytes(arquivo.tamanho_bytes)}
                        </p>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Nenhum arquivo anexado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
