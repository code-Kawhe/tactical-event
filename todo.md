# Tactical Event - TODO

## Backend / Database
- [x] Schema: tabela `registrations` com todos os campos necessários
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] Helper `getTeamCounts` - contagem de vagas por equipe
- [x] Helper `createRegistration` - inserir nova inscrição
- [x] Helper `getAllRegistrations` - listar todas as inscrições (admin)
- [x] Procedure pública `registration.getTeamCounts` - retorna vagas disponíveis
- [x] Procedure pública `registration.create` - cria inscrição com validação de vagas
- [x] Procedure protegida `registration.list` - lista inscrições (somente admin)
- [x] Procedure pública `registration.getEventLinks` - retorna links dos grupos

## Frontend - Página de Inscrição
- [x] Design escuro com paleta militar (preto, verde militar, cinza escuro)
- [x] Fontes militares/táticas via Google Fonts
- [x] Header com nome do evento e identidade visual
- [x] Formulário: Nome completo (obrigatório)
- [x] Formulário: Telefone do participante (obrigatório)
- [x] Formulário: Telefone de familiar (obrigatório)
- [x] Formulário: Confirmação maior de 18 anos (sim/não, obrigatório)
- [x] Seção escolha de equipe: FORÇA DE INTERVENÇÃO e MILÍCIA LOCAL
- [x] Bloqueio automático de equipe ao atingir 75 participantes (tempo real)
- [x] Exibição de vagas disponíveis por equipe
- [x] Opcional: Patch oficial R$ 20,00 (sim/não)
- [x] Opcional: Camisa oficial com seleção de tamanho P, M, G, GG
- [x] Opcional: Acompanhante com campo de quantidade
- [x] Validação de formulário com mensagens de erro
- [x] Submissão do formulário com loading state

## Frontend - Tela de Confirmação
- [x] Mensagem de confirmação de inscrição
- [x] Link do grupo principal do evento
- [x] Link específico da equipe escolhida
- [x] Design coerente com a identidade visual

## Frontend - Painel Administrativo
- [x] Rota /admin protegida por autenticação
- [x] Tabela listando todas as inscrições
- [x] Colunas: Nome, Equipe, Patch, Camisa/Tamanho, Acompanhantes, Telefones, Maior de Idade
- [x] Contadores de vagas por equipe no topo
- [x] Design consistente com tema militar

## Testes
- [x] Teste de criação de inscrição
- [x] Teste de bloqueio de vagas
- [x] Teste de listagem admin

## Atualizacoes com Imagens e PDF
- [x] Upload de 4 imagens (logo, regras, uniforme, termos)
- [x] Integracao de imagem 1 (logo Falcao Negro) no topo
- [x] Integracao de imagem 2 (regras e itens obrigatorios)
- [x] Integracao de imagem 3 (padrao de vestimenta antes da escolha de equipe)
- [x] Integracao de imagem 4 (termos e responsabilidade antes do envio)
- [x] Mudar nome do evento para "Operacao Falcao Negro"
- [x] Implementar aviso para menores de idade na tela de confirmacao
- [x] Botao de download de PDF para menores (placeholder aguardando arquivo)


## Atualizacoes com CPF e Maioridade
- [x] Adicionar campo CPF (obrigatorio) com validacao
- [x] Criar indice unico para CPF no banco de dados
- [x] Implementar validacao de CPF duplicado (apenas uma inscricao por CPF)
- [x] Alterar pergunta de maioridade para Sim/Nao (radio buttons)
- [x] Permitir inscricao de menores de idade (isAdult = false)
- [x] Exibir aviso destacado para menores na tela de confirmacao
- [x] Adicionar botao de download de PDF para menores (placeholder aguardando arquivo)
- [x] Atualizar testes para incluir validacao de CPF
- [x] Todos os 12 testes passando


## Export em Excel com Numeracao Sequencial
- [x] Adicionar campo de numeracao sequencial no schema (numero de 1 a 150)
- [x] Criar helper para gerar numero automaticamente ao inscrever
- [x] Criar procedure tRPC para exportar inscrições em Excel
- [x] Implementar botao de download no painel admin
- [x] Testar export com dados reais


## Integração Stripe e Preços

### Exibição de Preços
- [ ] Exibir preço da inscrição: R$ 50,00
- [ ] Exibir preço da camisa: R$ 50,00
- [ ] Exibir preço do patch: R$ 15,00
- [ ] Exibir preço do acompanhante: R$ 25,00
- [ ] Calcular total dinâmico na inscrição

### Integração Stripe
- [ ] Adicionar feature Stripe ao webdev
- [ ] Configurar chaves Stripe (pública e secreta)
- [ ] Criar procedure tRPC para criar checkout session
- [ ] Implementar webhook para confirmar pagamento
- [ ] Atualizar status de pagamento no banco de dados
- [ ] Bloquear inscrição até confirmação de pagamento
- [ ] Testar fluxo completo de pagamento


## Pagamento via Pix

### Exibição de Preços
- [x] Exibir preço da inscrição: R$ 50,00
- [x] Exibir preço da camisa: R$ 50,00
- [x] Exibir preço do patch: R$ 15,00
- [x] Exibir preço do acompanhante: R$ 25,00
- [x] Calcular total dinâmico na inscrição
- [x] Resumo de preços na tela de inscrição

### Schema e Banco de Dados
- [x] Adicionar campo paymentStatus (pending/confirmed) ao schema
- [x] Adicionar campo pixKey (não necessário - usando placeholder) para armazenar chave Pix
- [x] Adicionar campo whatsappLink (não necessário - usando link fixo) para link de contato
- [x] Criar migracao SQL

### Tela de Confirmacao
- [x] Exibir valor total a pagar
- [x] Exibir chave Pix (placeholder aguardando valor) para transferencia
- [x] Exibir instrucoes de pagamento
- [x] Botao para enviar comprovante via WhatsApp
- [x] Aviso: inscrição pendente de confirmação de pagamento

### Painel Admin
- [ ] Filtrar inscricoes por status de pagamento
- [x] Botao para confirmar pagamento (procedure tRPC criada)
- [x] Marcar inscricao como confirmada (via procedure)
- [ ] Exibir status na tabela de inscritos

### Testes
- [x] Testar fluxo completo (12 testes passando)
- [ ] Testar confirmacao de pagamento no admin
- [x] Testar redirecionamento (link WhatsApp integrado) para WhatsApp
