# 🍽️ FyMenu — Roadmap Completo & Contexto

> **Atualizado em:** Final da sessão de 05/05/2026
> **Cliente único ativo:** Âncora Criativa (`ancora.fymenu.com`)
> **Stack:** Next.js 16 App Router + TypeScript + Supabase + Vercel Pro + Tailwind + shadcn/ui

---

## 🔑 IDENTIFICADORES CRÍTICOS

```
Supabase project ID:  rjfbavmupiypxiqzksxo (região São Paulo)
Vercel project ID:    prj_3OW3S590c7PfEU7teDFoPSA46EeZ
Vercel team ID:       team_gTjiVlC0YX6VfYdbYEm3AEgV
GitHub:               fergusonrodrigues-maker/fymenu
Domain:               fymenu.com (Cloudflare DNS, wildcard *.fymenu.com via Vercel)
Repo local:           C:\Users\Ferguson\Documents\fymenu (PowerShell, sem bash)

Restaurant Âncora:    ee4d8b8d-b85c-402d-a5fe-378d8f910979
Unit Âncora (slug):   d74be79e-fa66-4a83-a0e9-1c125e071ae4 (slug "ancora")
```

---

## 👥 USUÁRIOS DE TESTE (Portal do Colaborador)

URL: `ancora.fymenu.com/colaborador`
Senha de todos: **`teste123`**

| Função | Username | Role |
|---|---|---|
| 🍽️ Garçom | `joao.garcom` | `waiter` |
| 👨‍🍳 Cozinha | `maria.cozinha` | `kitchen` |
| 👔 Gerente | `carlos.gerente` | `manager` |
| 🛵 Entregador | `pedro.delivery` | `deliverer` |
| 💳 Caixa | `ana.caixa` | `cashier` |

---

## 🟢 BLOCOS CONCLUÍDOS

### ✅ BLOCO A — Multi-owner + Histórico
- Schema `restaurant_members` (owners + sócios convidados)
- `getTenantContext` busca via members, não mais via `owner_id`
- UI "Sócios" em Configurações: convidar via link, copiar URL, compartilhar WhatsApp
- Página `/aceitar-convite?token=XXX` com 4 estados (erro/login/email errado/aceitar)
- 3 RPCs SECURITY DEFINER (`get_invite_by_token`, `accept_invite_by_token`, `decline_invite_by_token`)
- Schema `activity_log` consolidado
- Helper `lib/audit/logActivity.ts` integrado em: cardápio (CRUD produtos/categorias), financeiro, configs unidade, sócios
- Tela "Histórico" com 4 filtros (Quem/O que/Quando/Busca) + paginação + diff humanizado
- Badge "Editado por X há Y" inline em produtos/categorias/custos/sócios + drawer com timeline completa

### ✅ BLOCO B — Tarefas + Foto + WhatsApp
- Schema `task_templates`, `task_instances`, `task_completions`
- Bucket `task-photos` (privado, 5MB max, JPEG/PNG/WebP/HEIC, retenção 30 dias)
- Modal Tarefas no painel com 3 abas (Em andamento/Templates/Histórico)
- Templates recorrentes (daily/weekly/monthly) + tarefas avulsas
- Atribuição por cargo OU funcionário específico
- Geração lazy via `lib/tarefas/ensureTodayTasks.ts` (sem cron)
- Funções SQL `generate_task_instances_for_unit()` + `expire_old_task_instances()`
- Portal do Colaborador: ver tarefas, concluir com foto da câmera (compressão client-side)
- Schema `notifications` + Realtime
- Sininho no painel com badge contador e Realtime
- Integração Z-API (helper `sendZapiMessage`) — manda WhatsApp pro `restaurants.owner_phone`
- ⚠️ **Z-API da Âncora expirada** ("To continue sending a message, you must subscribe to this instance again") — problema externo, código OK

---

## ✅ BLOCO C — Comandas (concluído)

### Concluído
- Schema: `customer_name` NOT NULL, `customer_phone` configurável via toggle `units.comanda_require_phone`
- `comanda_splits` expandido com `comanda_id`, `customer_name`, `customer_phone`, `payment_method`, `amount`, `paid_at`, `change_amount`
- Form abrir comanda no portal do garçom (máscara soft de telefone, validação)
- Auto-cadastro CRM com `source='comanda'` ao abrir comanda com telefone
- Portal Garçom: lista 120 mesas (Âncora) com status (livre/ocupada/reservada)
- Modal "Abrir comanda" (mesa + balcão + viagem)
- Detalhe da comanda: lista items + carrinho temporário + adicionar via cardápio
- Server action `sendCartToKitchen` insere em `comanda_items` + recalcula `subtotal`/`total`
- Cancelar item com motivo + audit em `comanda_audit_log`
- Modal de fechamento: 3 modos (não dividir / dividir igualmente / dividir manualmente)
- Server action `closeComanda` com guard de status + insert em `comanda_splits`
- Liberar mesa após fechamento (`mesas.status='available'`)
- Schema `payments` expandido (`comanda_id`, `comanda_split_id`, `unit_id`)
- Backfill: payment de comanda 3190 (R$ 159,80 PIX) criado retroativamente
- Bug fix: `closeComanda` agora cria payments automaticamente (1 por split)
- Bug fix: `closed_by_role` + `updated_at` adicionados ao schema de `comandas`
- Nova seção "Origem do faturamento" no Financeiro com toggle Salão/Delivery/Todos
- **C.5** Realtime chamadas garçom — UI consumindo Realtime de `table_calls` (commit `e22a257`) + som de alerta (commit `55a4a64`) + anti-trote via RPC `create_table_call` (commit `55a4a64`)
- **C.6** Cadastro de impressoras — modal no painel (commit `8b3197e`) + fix `type='thermal_browser'` (commit `bd76ef7`); 3 impressoras cadastradas em Âncora (Cozinha1, Bar, Caixa)
- **C.7** Disparo de impressão — `window.print` client-side via `thermal_browser` (commit `3f451d3`); roteamento por categoria validado (Cozinha + Bar imprimem separado quando categorias mapeadas)

---

## ✅ BLOCO K — Unificação Monetária (concluído)

### Migração de schema (centavos como inteiro)
- 14 colunas convertidas de `numeric` → `integer` (centavos):
  - `products.base_price`
  - `product_variations.price_delta` (e correlatas)
  - `product_addons.price`
  - `product_combos.price`
  - `order_intents.total`
  - `order_items.price`, `order_items.subtotal`
  - `order_item_addons.price`
  - `orders.total`
  - `comanda_splits.amount`, `comanda_splits.change_amount`
  - `split_items.price`
  - `waiter_orders.total`
  - `crm_customers.total_spent`
- Backup completo preservado em schema `backups.*` (tabelas `*_money_20260501`)
- 5 produtos lixo (Hamburger Premium R$8.000, "teste" R$1.550 ×4) inativados via soft delete

### UI cardápio público (commit `8646e8c`)
- `MenuClient`, `ProductCard`, `ProductModal`, `UpsellModal`, `CartModal`, `CartBar`, `BottomGlassBar`, `MenuCarousel`, `orderBuilder` migrados para `formatCents`

### UI comandas (commit `6fb39e3`)
- Comanda do cliente, portal do garçom, `EditOrderModal`, `PDVModal`, `TableCard`, `ComandaDetailClient`, `ProductPickerModal`, `CloseComandaModal` usando `formatCents`

### Helpers e infra
- `lib/money.ts`: `formatCents`, `formatCentsBare`, `parseToCents`
- `components/ui/MoneyInput.tsx` — componente estilo máquina de cartão (digita centavos, exibe formatado)
- Cache do menu (storage bucket `menu-cache`) invalidado pós-migração
- Fix lista de comandas (commit `19de18e`): `formatCents` + `revalidatePath` após `sendCartToKitchen`

---

## 🔴 BLOCOS PENDENTES (em ordem de execução)

### BLOCO G — Portal Colaborador completo (telas por função)
- **G.1** Refinar Portal Garçom (mesas + comandas já existem, falta UX details)
- **G.2** Portal Cozinha: KDS (kitchen display) com fila + tempo preparo
- **G.3** Portal Caixa: fechamento + recebimento + dia dos clientes atendidos
- **G.4** Portal Gerente: visão consolidada + aprovações + auditoria
- **G.5** Portal Entregador: pedidos delivery + rotas + foto entrega

### BLOCO F — Drag-and-Drop
- **F.1** Reordenar produtos dentro de cada categoria
- **F.2** Reordenar categorias entre si

### BLOCO H — Performance
- **H.1** Diagnóstico real (latência das ações lentas)
- **H.2** logActivity fire-and-forget assíncrono real (atual usa await)
- **H.3** Reduzir queries N+1 nos modais
- **H.4** Avaliar Redis/Upstash pra cache

### BLOCO D — Relatório diário automático WhatsApp
- **D.1** Engine de geração de relatório
- **D.2** Cron/scheduler dispara no horário de fechamento
- **D.3** Texto formatado pra WhatsApp (faturamento, pedidos, ticket médio, top 3 produtos, formas pagamento, alertas estoque)
- **D.4** Tela visualização de relatórios passados

### BLOCO E — ADM Compras consolidado (UI)
- **E.1** Tela única: lançamento + entrada estoque + receitas
- **E.2** Vinculação de compra com produto vendido
- Schema `business_expenses` + `inventory_items` + `inventory_movements` + `product_recipes` já existem

### BLOCO I — Testes ponta-a-ponta
- **I.1** Validar BLOCO 4 (importação histórica)
- **I.2** Validar BLOCO A (sócios, histórico, badges)
- **I.3** Validar BLOCO B (tarefas + foto + WhatsApp)
- **I.4** Validar BLOCO C completo (comandas, splits, impressão)
- **I.5** Bugs encontrados → corrigir

### BLOCO J — Pendências críticas pré-launch
- **J.1** Asaas: sandbox → produção (`ASAAS_SANDBOX=false`)
- **J.2** RLS — ✅ **0 tabelas sem RLS** (validado em 30/04/2026)
- **J.3** Password reset flow (não existe ainda)
- **J.4** Provedor de email transacional (Resend recomendado) — automatiza convites de sócios
- **J.5** Z-API Âncora: reativar instância (assinatura expirada)
- **J.6** Migração vídeos → AWS S3 + CloudFront (pra escala)

---

## 🧰 PENDÊNCIAS DE DÍVIDA TÉCNICA

### Unificação monetária (Fase 2)
- **Fase 2 commit 4** Forms admin de produto/variação/addon/combo precisam adotar `MoneyInput`
- **Fase 2 commit 5** Tela financeiro precisa migrar para `formatCents`

### Impressoras
- UI permite cadastrar nome de impressora duplicado (validação case-insensitive ausente)
- Modal de impressora `purpose=cashier` exibe dropdown de categorias inútil (deveria ocultar)
- Modal de impressora `purpose=cashier` não permite editar `num_copies`
- Print preview do Chrome aparece — configurar `kiosk-printing` nos dispositivos cliente

### Integrações externas
- Z-API Âncora expirada (cliente sem WhatsApp transacional)
- Asaas em sandbox — trocar para produção antes do launch
- `OPENAI_API_KEY` não verificada nas env vars do Vercel

---

## 🛠️ PADRÕES TÉCNICOS IMUTÁVEIS

### Schema
- **Produtos:** `thumbnail_url` / `video_url` (NUNCA `thumb_path`, `image_path`, `video_path`)
- **Preço produto:** `base_price` (NUNCA `product.price`)
- **Valores monetários:** centavos (inteiros), formatação só na UI
- **Migrations:** sempre com `IF NOT EXISTS` em ALTER/CREATE TABLE
- **Soft delete:** `is_active = false`, NUNCA hard DELETE
- **Senha de funcionários:** bcrypt

### RLS
- **Authenticated:** `FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (...)`
- **Público (comanda, reviews):** `FOR ALL USING (true) WITH CHECK (true)`
- **Member-based:** usar helper `is_restaurant_member(restaurant_id, user_id)` SECURITY DEFINER

### Realtime
- `ALTER PUBLICATION supabase_realtime ADD TABLE` como statement separado
- Tabelas com Realtime ativo: `comandas`, `comanda_items`, `mesas`, `table_calls`, `notifications`

### Server Actions
- Em arquivos `"use server"`: **NUNCA exportar types** — gera `ReferenceError` em runtime
- Mover types para arquivo `utils.ts` separado
- Retornar `{ ok: false, error: "..." }` em vez de `throw new Error(...)` quando erro é esperado pelo cliente
- Throw só pra erros sistêmicos não-recuperáveis

### Ordem CRUD
- Pre-fetch do registro antes de UPDATE/DELETE pra:
  - Calcular changes diff (audit log)
  - Saber `entity_name` antes de deletar
- Recalcular totais (subtotal, total) **toda vez** que items mudam

### URLs internas vs públicas
- Subdomínios reescrevem internamente:
  - `ancora.fymenu.com/colaborador/X` → `/colaborador-app/[slug]/X`
- **Hrefs visíveis ao usuário** sempre `/colaborador/X`, NUNCA `/colaborador-app/[slug]/X`

### Vercel
- Deploya HEAD do branch — múltiplos commits locais viram um único deploy
- Estado sempre reflete último commit pushed

---

## 🎨 DESIGN SYSTEM

| Área | Tema | Detalhes |
|---|---|---|
| Painel + Landing | Toggle light/dark, default light | CSS vars `--dash-*` |
| Portais (colaborador/cliente/cardápios públicos) | Light fixo | Mais minimalista |
| Super Admin + Suporte + Parceiros | Dark fixo | Premium |

### Cores
- **Dark accent:** `#00ffae` → `#00d9ff`, bg `#050505`, fonte Montserrat
- **Light accent:** `#d51659` → `#fe4a2c`, bg `#fafafa`
- **Cardápio público (delivery):** accent laranja `#FF6B00`, cinema black

### Botões
- Salvar = verde `#16a34a`
- IA = roxo `#8b5cf6`
- Fechar/destrutivo = vermelho `#ef4444` com X branco
- Cancelar = cinza outline

### Modais do dashboard
- Inline styles com CSS variables (`var(--dash-accent)`, `var(--dash-text)`, etc) — NÃO Tailwind
- Glassmorphism, blur 80px

### Background dots
- **Dark:** dots claros concentrados no centro (radial)
- **Light:** dots `#050505` mais aparentes nas bordas, menos no centro (inverso do dark)
- **Sem efeito de brilho seguindo mouse em nenhuma página**

### Sessão
- "Mantenha-me conectado" = 30 dias localStorage
- Sem marcar = sessionStorage
- Super Admin / Suporte / Parceiros = sempre sessionStorage

### Produto especificações imutáveis
- ProductModal: 9:16 fullscreen (reels-style)
- Swipe horizontal navega produtos
- Swipe vertical fecha modal
- Menu cache engine centraliza JSON
- Feature flags por unit
- 12 analytics events + Product Attention Time

---

## 📋 PLANOS E PREÇOS OFICIAIS

| Plano | Mensal | Trim | Sem | Unidades |
|---|---|---|---|---|
| Menu | R$ 199,90 | R$ 179,90 | R$ 159,90 | 1 |
| MenuPro | R$ 399,90 | R$ 359,90 | R$ 319,90 | 3 |
| Business | R$ 1.599 | R$ 1.399 | R$ 1.199 | 4 |

**Cupom indicação:** 10% comissão recorrente para indicador (cliente NÃO recebe desconto)

**Features Business-only:**
- Chatbot IA (WhatsApp com respostas automáticas — inseparável)

**MenuPro + Business:**
- Cálculo automático taxa de entrega
- Recepção de localização do cliente
- Rastreamento de entregador (distribuição entre planos pendente)

---

## 🔄 WORKFLOW

### Padrão de prompts
1. TAREFA descrita
2. CONTEXTO
3. ALTERAÇÃO ESPECÍFICA numerada
4. NÃO ALTERAR (guards)
5. REGRA DE OURO: Alterações novas NUNCA desfazem alterações anteriores
6. Commit message + push

### Fluxo de execução
- Ferguson executa no Claude Code (VS Code), commita durante a sessão, push único no final do dia
- Claude (MCP) cuida de migrations e verificações no Supabase; Ferguson implementa código via Claude Code
- Nunca duplicar rotas ou código existente — sempre verificar antes de criar

### Comando de retomada
**"começo do dia"** dispara workflow:
1. Reler arquivos do projeto
2. Verificar último deploy Vercel
3. Verificar git log recente
4. Apresentar lista de pendências antes de prosseguir

---

## 📊 DADOS ATUAIS NO BANCO (snapshot)

```
Restaurants:               6 com owner ativo
Units:                     ~10
Mesas (Âncora):            120
Funcionários (Âncora):     5 (1 por função, todos teste123)
Comandas:                  1 fechada (3190, R$ 159,80 PIX)
Comanda items:             1 ativo (Burgão M)
Tarefas templates:         0
Tarefas instances:         3 manuais
Task completions:          2 com foto
Notifications:             1 task_completed (whatsapp_status='failed' por Z-API expirada)
Activity log:              ~10 registros (CRUD cardápio, financeiro, sócios)
Restaurant members:        6 owners ativos
Payments:                  2 (1 delivery, 1 comanda salão)
```

---

## ⚠️ BUGS CONHECIDOS (resolvidos nesta sessão)

| Bug | Causa | Resolução |
|---|---|---|
| `ReferenceError: ImportTargetTable` | `export type {}` em arquivo `"use server"` | Mover types pra utils.ts |
| Login error vira "Server Components render error" | Server action throw em vez de retornar | Retornar `{ ok: false, error }` |
| `/colaborador/tarefas` 404 | Route group `(protected)` causando conflito Next 16 | Flatten — remover `(protected)/` |
| Cards de home com 404 | hrefs apontando pra URL interna `/colaborador-app/[slug]/...` | Usar URL pública `/colaborador/...` |
| Constraint `crm_customers_source_check` | `'comanda'` não estava na whitelist | ALTER constraint pra incluir |
| Constraint `task_instances_unique_template_date` bloqueia avulsas | `NULLS NOT DISTINCT` em `template_id` | Trocar por índice parcial `WHERE template_id IS NOT NULL` |
| Telefone com hífen não apaga | Máscara hard | Soft mask (formatação só no display) |
| Splits duplicados ao fechar comanda | Sem debounce em "Confirmar pagamento" | `setClosing(true)` + guard de status no banco |
| Comanda fechada não aparece em Financeiro | UI lia só `order_intents` | Nova seção paralela lendo `payments` direto |
| `subtotal`/`total` zerados ao adicionar items | Faltou recalcular após insert | Recalcular após item changes |
| `closed_by_role` / `updated_at` ausentes | Schema incompleto | ALTER TABLE adicionar colunas |
| Z-API "subscribe to this instance again" | Assinatura expirada | Reativar conta Z-API (fora do código) |

---

## 🚀 PRÓXIMA AÇÃO IMEDIATA (próximo chat)

**Ordem confirmada:**

1. **G.2** — Portal Cozinha (KDS)
2. **G.3** — Portal Caixa
3. **G.4** — Portal Gerente
4. **G.5** — Portal Entregador
5. **F** — Drag-and-drop produtos/categorias
6. **H** — Performance
7. **I** — Testes ponta-a-ponta
8. **D** — Relatório diário WhatsApp
9. **E** — ADM compras consolidado
10. **J** — Pré-launch
11. **K Fase 2** — Forms admin com `MoneyInput` + tela financeiro com `formatCents`

---

## 💬 COMO RETOMAR EM OUTRO CHAT

Cole esta primeira mensagem:

> Continuando desenvolvimento do FyMenu. Anexei o roadmap atualizado em MD. BLOCO C completo (incluindo C.5 Realtime chamadas, C.6 impressoras e C.7 impressão) e BLOCO K (unificação monetária) concluídos. Próximo passo: G.2 (Portal Cozinha — KDS). Pode me mandar o prompt da G.2?

E anexa este arquivo (`fymenu_roadmap.md`).

---

## 📁 ARQUIVOS-CHAVE DO PROJETO

```
lib/tenant/getTenantContext.ts
lib/tenant/isRestaurantMember.ts
lib/audit/logActivity.ts
lib/tarefas/ensureTodayTasks.ts
lib/notifications/createNotification.ts
lib/whatsapp/sendZapiMessage.ts

app/colaborador-app/actions.ts
app/colaborador-app/[slug]/ColaboradorLoginClient.tsx
app/colaborador-app/[slug]/layout.tsx
app/colaborador-app/[slug]/home/ColaboradorHomeClient.tsx
app/colaborador-app/[slug]/tarefas/page.tsx
app/colaborador-app/[slug]/ponto/page.tsx
app/colaborador-app/[slug]/mesas/page.tsx
app/colaborador-app/[slug]/comandas/[id]/page.tsx
app/colaborador-app/[slug]/_components/BottomNav.tsx

app/painel/actions.ts
app/painel/membersActions.ts
app/painel/historicoActions.ts
app/painel/tarefasActions.ts
app/painel/financeiro/actions.ts
app/painel/importar/actions.ts
app/painel/importar/utils.ts

app/painel/modals/HistoricoModal.tsx
app/painel/modals/HistoricoEntityModal.tsx
app/painel/modals/TarefasModal.tsx
app/painel/modals/ImportarHistoricoModal.tsx
app/painel/modals/FinanceiroModal.tsx
app/painel/modals/ConfigModal.tsx
app/painel/DashboardClient.tsx

app/aceitar-convite/page.tsx
app/aceitar-convite/actions.ts
app/aceitar-convite/AceitarConviteClient.tsx

app/u/[slug]/mesa/page.tsx
app/u/[slug]/mesa/GarcomButton.tsx
app/u/[slug]/actions.ts

components/audit/LastEditBadge.tsx
middleware.ts
next.config.ts
```

---

**Fim do documento.** Bom trabalho na próxima sessão. 🚀
