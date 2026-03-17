# CHECKLIST QA — FASE 4

## CENÁRIO 1: Fluxo Ponta a Ponta
- [ ] Signup com email
- [ ] Confirmar email (check inbox)
- [ ] Completar onboarding
- [ ] Dashboard carrega
- [ ] Criar categoria
- [ ] Criar produto com preço
- [ ] Criar variação
- [ ] Acessar /u/[slug] (cardápio público)
- [ ] ProductModal abre
- [ ] Selecionar variação
- [ ] Criar pedido (clique "Pedir")
- [ ] Modal de confirmação
- [ ] Link WhatsApp gerado
- [ ] Abrir WhatsApp funciona
- [ ] Mensagem com itens + total correto

## CENÁRIO 2: Validação de Estoque
- [ ] Produto com stock = 0
- [ ] Botão "Pedir" desabilitado
- [ ] Mensagem "Indisponível" exibida
- [ ] Não conseguir criar pedido

## CENÁRIO 3: Cálculo de Totais
- [ ] 1x Pizza R$ 45 → Total R$ 45,00
- [ ] 2x Pizza R$ 45 → Total R$ 90,00
- [ ] Com desconto R$ 10 → Total R$ 35,00 (se 1x R$ 45)
- [ ] Com variação → preço correto atualiza

## CENÁRIO 4: Dashboard de Pedidos
- [ ] /dashboard/orders carrega
- [ ] Lista pedidos criados
- [ ] Filtros por status funcionam
- [ ] Clique em pedido abre detalhe
- [ ] Botão "Enviar WhatsApp" funciona
- [ ] Status muda para "sent"
- [ ] Botão "Confirmar" muda para "confirmed"
- [ ] Botão "Cancelar" funciona

## CENÁRIO 5: Menu Cache
- [ ] Primeira vez: cache_build acontece
- [ ] Segunda vez: cache é usado (super rápido)
- [ ] Salvar produto → cache invalidado
- [ ] Cache recriado
- [ ] 24h depois: cache expira e reconstrói

## CENÁRIO 6: Edge Cases
- [ ] Criar pedido sem items → erro
- [ ] Produto sem preço → erro
- [ ] Unit sem WhatsApp → erro claro
- [ ] Não autenticado → redirect

## PERFORMANCE
- [ ] PageSpeed Insights > 85
- [ ] LCP < 2.5s
- [ ] First Contentful Paint < 1.5s
- [ ] Images lazy loading
- [ ] Thumbnails em WebP

## SEO
- [ ] Meta tags presentes (title, description, og:image)
- [ ] robots.txt acessível
- [ ] sitemap.xml acessível
- [ ] Structured data (JSON-LD) presente

## BROWSER COMPATIBILITY
- [ ] Chrome/Edge (Windows)
- [ ] Safari (iOS)
- [ ] Firefox (Desktop)
- [ ] Samsung Internet (Android)

## DEPLOY
- [ ] git push completo
- [ ] Vercel deploy READY
- [ ] Sem warnings/errors console
- [ ] Todas as rotas funcionam
