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
