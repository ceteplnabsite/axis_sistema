# 🎓 Áxis - Sistema de Gestão de Notas

Sistema moderno de gestão escolar desenvolvido com Next.js 15, TypeScript, Prisma e PostgreSQL.

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação & Permissões
- ✅ Login com NextAuth.js
- ✅ Proteção de rotas
- ✅ **Permissões Granulares:**
  - **Superuser:** Acesso total (Criar/Editar/Excluir)
  - **Professor:** Acesso apenas às suas disciplinas/turmas
- ✅ Sessões seguras e criptografia com bcrypt

### 📊 Dashboard
- ✅ Estatísticas em tempo real
- ✅ Cards interativos com contadores
- ✅ Ações rápidas (Lançar Notas, Recuperação, Conselho)
- ✅ Menu de navegação responsivo

### 👥 Gerenciamento de Turmas
- ✅ Listagem de turmas (com filtro de permissão)
- ✅ Criar nova turma (apenas Admin)
- ✅ Editar turma existente
- ✅ Excluir turma (com validação)
- ✅ **Relatório Geral (PDF)**
- ✅ **Matriz de Status (PDF)**: Visão geral de aprovações por disciplina

### 🎓 Gerenciamento de Estudantes
- ✅ Listagem em tabela responsiva
- ✅ Criar novo estudante (apenas Admin)
- ✅ **Importação em Massa via CSV**
- ✅ Editar estudante existente
- ✅ Excluir estudante (com validação)
- ✅ Visualizar boletim individual
- ✅ Gerar PDF do boletim
- ✅ Busca em tempo real

### 📚 Gerenciamento de Disciplinas
- ✅ Listagem agrupada por turma
- ✅ Criar nova disciplina (apenas Admin)
- ✅ Editar disciplina existente
- ✅ Excluir disciplina
- ✅ Contador de notas por disciplina

### 📝 Lançamento de Notas
- ✅ Seleção de turma e disciplina (filtradas por permissão)
- ✅ Tabela interativa para lançamento
- ✅ Cálculo automático de status:
  - Nota ≥ 5: **Aprovado**
  - Nota < 5: **Recuperação**
  - Nota = -1: **Desistente**
- ✅ Atualização em tempo real
- ✅ Auditoria completa

### 🔄 Recuperação & Conselho
- ✅ **Sistema de Recuperação:**
  - Lançamento de notas de recuperação
  - Cálculo automático: `(Original + Recuperação) / 2`
  - Atualização automática de status (Aprovado Recup. / Dependência)
- ✅ **Conselho de Classe:**
  - Alteração de status sem modificar notas
  - Opções: Aprovado pelo Conselho, Dependência, Conservado

### 📄 Relatórios em PDF
- ✅ **Boletim Individual:** Notas, médias e status
- ✅ **Relatório da Turma:** Estatísticas e lista completa
- ✅ **Matriz de Status:** Tabela comparativa disciplina x estudante

### 🔍 Auditoria
- ✅ Registro de todas as alterações de notas e status
- ✅ Histórico de modificações (quem mudou, quando e o que)
- ✅ Rastreamento de usuário responsável

## 🚀 Tecnologias Utilizadas

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL, NextAuth.js
- **PDF:** jsPDF, jspdf-autotable

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 12+

### Passos

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure as variáveis de ambiente:**

Arquivo `.env`:
```env
DATABASE_URL="postgresql://postgres:admin2024@localhost:5432/resultados"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

3. **Configure o banco de dados:**

```bash
# Criar tabelas
npm run db:push

# Popular dados iniciais
npm run db:seed
```

4. **Inicie o servidor:**
```bash
npm run dev
```

5. **Acesse:** http://localhost:3000

## 🔑 Credenciais Padrão

- **Usuário:** admin
- **Senha:** admin123

## 📁 Estrutura do Projeto

```
axis-nextjs/
├── prisma/               # Database Schema & Seeds
├── src/
│   ├── app/
│   │   ├── api/          # API Routes (Backend)
│   │   ├── dashboard/    # Pages (Frontend)
│   │   └── login/        # Auth Pages
│   ├── components/       # UI Components
│   └── lib/              # Helpers & Configs
└── public/               # Static Assets
```

---

**Áxis** - Sistema de Gestão Escolar Moderno 🎓
