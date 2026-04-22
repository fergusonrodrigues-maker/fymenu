"use client";
import {
  ShoppingCart, Target, Wallet, LayoutGrid, ChefHat,
  MapPin, Armchair, Store,
  Users, UserCircle, UserCog, Headphones, Bike,
  Package, PackageCheck, PackageX,
  Clock, Timer, Calendar,
  BarChart3, TrendingUp, FileText, Search,
  MessageCircle, Phone, Mail, Bell,
  Tv, Image, Video, Camera,
  Plus, Minus, X, Check, Pencil, Trash2, Download, Upload, RefreshCw, Settings, Printer,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink, Link2,
  AlertCircle, CheckCircle2, XCircle, Info, Lock, Unlock,
  UtensilsCrossed, Coffee, Wine, Pizza, Cookie, CreditCard, DollarSign, Receipt, Sparkles,
  Star, Flame, Zap, Home, Smartphone, Globe, LucideIcon,
  Clipboard, Building2, Truck, Eye, EyeOff, QrCode, ScanLine,
  ArrowLeft, ArrowRight, Send, RefreshCcw, ToggleLeft, ToggleRight,
  ClipboardList, PlayCircle, StopCircle, PauseCircle, Activity,
  Boxes, ShoppingBag, Tag, Percent, Hash,
} from "lucide-react";

const ICONS = {
  // Operações/Painel
  "mesas":        Armchair,
  "cozinha":      ChefHat,
  "garcom":       Target,
  "andamento":    Activity,
  "auditoria":    Search,
  "pedidos":      ShoppingCart,
  "pdv":          CreditCard,
  "cardapio":     UtensilsCrossed,
  "comanda":      ClipboardList,

  // Unidade/Local
  "unidade":      MapPin,
  "restaurante":  Store,
  "loja":         Store,
  "endereco":     MapPin,
  "home":         Home,

  // Equipe
  "equipe":         Users,
  "funcionario":    UserCircle,
  "gerente":        UserCog,
  "garcons":        Target,
  "entregadores":   Bike,
  "ponto":          Clock,
  "suporte":        Headphones,

  // Estoque
  "estoque":        Package,
  "pacote-ok":      PackageCheck,
  "pacote-falta":   PackageX,
  "caixas":         Boxes,
  "sacola":         ShoppingBag,

  // Financeiro
  "financeiro":     Wallet,
  "dinheiro":       DollarSign,
  "pagamento":      CreditCard,
  "recibo":         Receipt,
  "cupom":          Percent,
  "tag":            Tag,

  // Dados
  "analytics":      BarChart3,
  "relatorio":      FileText,
  "crescimento":    TrendingUp,
  "ia":             Sparkles,
  "busca":          Search,

  // Comunicação
  "whatsapp":       MessageCircle,
  "mensagem":       MessageCircle,
  "telefone":       Phone,
  "email":          Mail,
  "notificacao":    Bell,
  "enviar":         Send,

  // Delivery
  "delivery":       Bike,
  "moto":           Bike,
  "caminhao":       Truck,

  // Mídia
  "tv":             Tv,
  "imagem":         Image,
  "video":          Video,
  "camera":         Camera,
  "qrcode":         QrCode,
  "scan":           ScanLine,

  // Categorias de comida
  "food":           UtensilsCrossed,
  "drinks":         Wine,
  "bebidas":        Coffee,
  "pratos":         Pizza,
  "sobremesas":     Cookie,

  // Ações
  "adicionar":      Plus,
  "remover":        Minus,
  "fechar":         X,
  "check":          Check,
  "editar":         Pencil,
  "excluir":        Trash2,
  "baixar":         Download,
  "upload":         Upload,
  "atualizar":      RefreshCw,
  "reload":         RefreshCcw,
  "configuracoes":  Settings,
  "impressora":     Printer,
  "clipboard":      Clipboard,

  // UI/Navegação
  "seta-baixo":     ChevronDown,
  "seta-cima":      ChevronUp,
  "seta-esquerda":  ChevronLeft,
  "seta-direita":   ChevronRight,
  "voltar":         ArrowLeft,
  "avancar":        ArrowRight,
  "link-externo":   ExternalLink,
  "link":           Link2,
  "grid":           LayoutGrid,

  // Status
  "alerta":         AlertCircle,
  "sucesso":        CheckCircle2,
  "erro":           XCircle,
  "info":           Info,
  "trancado":       Lock,
  "destrancado":    Unlock,
  "estrela":        Star,
  "fogo":           Flame,
  "raio":           Zap,

  // Player
  "play":           PlayCircle,
  "stop":           StopCircle,
  "pause":          PauseCircle,

  // Misc
  "smartphone":     Smartphone,
  "globe":          Globe,
  "empresa":        Building2,
  "hash":           Hash,
  "olho":           Eye,
  "olho-off":       EyeOff,
  "timer":          Timer,
  "calendario":     Calendar,
  "lista":          FileText,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  color = "currentColor",
  className = "",
  style,
}: IconProps) {
  const Component = ICONS[name] as LucideIcon;
  if (!Component) return null;
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={style}
    />
  );
}
