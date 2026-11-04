# Importação do horário 2026.2 (Urânia → Áxis)

Scripts que leem o PDF do Urânia ("Relatório de Professores (Individual)") e ajustam
turmas, disciplinas, Matriz Curricular e vínculos de professor.

**Todos rodam em SIMULAÇÃO por padrão.** Só gravam com `--executar --banco=<nome do banco>`,
e o nome precisa ser igual ao do `DATABASE_URL` (trava contra banco errado). Cada execução
é uma transação: qualquer erro desfaz tudo. Toda alteração vai para a Auditoria com
origem `script horario-2026-2`.

## Arquivos

| Script | O que faz |
|---|---|
| `criar-usuarios.ts` | Cadastra professores do horário que não existem (ativos e aprovados, sem e-mail) |
| `gerar-planilha.ts` | Só leitura. Cruza o PDF com o banco e gera a planilha de revisão (`--regulares` para turmas EPTM) |
| `aplicar.ts` | Aplica a planilha: cria disciplinas, vincula/transfere professores, padroniza nomes, remove duplicatas vazias |
| `corrigir-turmas.ts` | Corrige turmas com curso/nome/modalidade errados e mescla turma duplicada |
| `limpar-semestrais.ts` | Deixa cada turma semestral do horário só com as disciplinas do horário (remove sobras vazias) |
| `encerrar-2026-1.ts` | Encerra turmas SUBSEQUENTE de 2026.1 (não move alunos) e conclui a 4TSJN1SUB (curso de 3 módulos) |

### Dados fora do git (`dados/`, no `.gitignore`)

O repositório é público, então dados pessoais e decisões específicas ficam em `dados/`:

- `dados/HORÁRIO.GERAL.2026.2.pdf` — horário do Urânia
- `dados/horario-2026-2/ajustes.ts` — turmas a encerrar/renomear, duplas de professores, dicionário de nomes, códigos errados do Urânia
- `dados/horario-2026-2/novos-professores.json` — professores a cadastrar e senha inicial
- `dados/planilha-revisao-*.csv` e `dados/relatorio-aplicar-*.txt` — saídas

## Regras usadas

- Turma: `série + T + sigla do curso + turno (M/V/N) + número + sufixo` (`E` = PROEJA, `SUB` = SUBSEQUENTE/PROSUB).
- O Urânia mostra 3 blocos por professor (6 horários Matutino, 6 Vespertino, 5 Noturno): o turno sai da posição.
- Duplas "A/B" no horário: quem assume está na tabela `DUPLAS` (a ordem do Urânia não é confiável).
- Um professor por disciplina. Nunca mexe em disciplina de turma ENCERRADA.
- Disciplina/turma só é apagada se estiver vazia (sem notas, questões, alunos).

## Ordem de execução na produção

1. **Faça um backup do banco** antes de começar (plano gratuito do Supabase não tem backup no painel:
   use `pg_dump` pela conexão do Session pooler).
   Aplique também os SQL de `prisma/sql-manual/` desta publicação (só criam colunas/tabela novas):
   `2026-11-04-lembrete-notas.sql`, `2026-11-04-mensagens-ciencia.sql`, `2026-11-04-chamados-fechamento.sql`.
2. Aponte `DATABASE_URL` para a conexão do **Session pooler** do Supabase (porta 5432,
   `aws-1-sa-east-1.pooler.supabase.com`). A conexão direta do plano gratuito só funciona por IPv6,
   e o Transaction pooler (porta 6543) não serve para as transações longas dos scripts.
3. Rode cada passo primeiro **sem** `--executar`, confira a saída, depois rode com
   `--executar --banco=<nome>`:

```bash
D=scripts/horario-2026-2; PDF="dados/HORÁRIO.GERAL.2026.2.pdf"
npx tsx $D/criar-usuarios.ts  --usuario=<admin>        # professores novos (dados/horario-2026-2/novos-professores.json)
npx tsx $D/gerar-planilha.ts  "$PDF"
npx tsx $D/aplicar.ts         --usuario=<admin>
npx tsx $D/corrigir-turmas.ts --usuario=<admin>
npx tsx $D/gerar-planilha.ts  "$PDF"                 # de novo, com as turmas já corrigidas
npx tsx $D/aplicar.ts         --usuario=<admin>      # limpa duplicatas que só aparecem agora
npx tsx $D/gerar-planilha.ts  "$PDF"                 # planilha atualizada (obrigatório antes de limpar)
npx tsx $D/limpar-semestrais.ts --usuario=<admin>    # turmas semestrais só com as disciplinas do horário
npx tsx $D/gerar-planilha.ts  "$PDF" --regulares
npx tsx $D/aplicar.ts         --usuario=<admin> --planilha=dados/planilha-revisao-regulares.csv
npx tsx $D/encerrar-2026-1.ts --usuario=<admin>
```

4. Conferência final: as duas planilhas devem sair 100% `OK`.
5. Chamados antigos nunca respondidos (limpeza única de Mensagens, mesma trava de banco):
   `npx tsx scripts/mensagens/fechar-chamados-antigos.ts --usuario=<admin>` → conferir → `--executar --banco=<nome>`.
   Os já respondidos e sem retorno há 7 dias fecham sozinhos na rotina diária (`/api/cron/chamados`).

Os IDs fixos em `ajustes.ts`/`corrigir-turmas.ts` vieram da cópia local da produção. Se a
produção estiver diferente, os scripts acusam erro e não gravam nada.

## Teste feito (04/11/2026)

Em uma cópia do banco reconstruída no estado original, a sequência acima foi executada do
zero e o resultado comparado com o banco conferido manualmente: 4.575 itens (turmas,
cursos, disciplinas com professores/notas/questões, matriz, alunos, usuários), 0 diferenças.
