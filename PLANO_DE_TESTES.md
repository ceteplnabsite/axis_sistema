# Plano de Testes Detalhado - Áxis v2.0 (CETEP/LNAB)

Este documento descreve o roteiro de testes completo, dividido pelas visões de cada tipo de usuário no sistema.

---

## 1. Visão do ADMINISTRADOR (Superuser)
*O Administrador tem controle total sobre a infraestrutura e segurança.*

| Funcionalidade | O que testar | Sucesso se... |
| :--- | :--- | :--- |
| **Gestão de Usuários** | Criar um novo usuário Professor e um Diretor. | O sistema deve enviar e-mail automático com a senha gerada. |
| **Configuração Global** | Mudar o "Ano Letivo Atual" nas configurações. | Todo o sistema deve filtrar turmas e notas para o ano selecionado. |
| **Auditoria de Sistema** | Realizar uma alteração de nota e verificar o log. | O log deve registrar: Quem alterou, Onde, Valor Antigo e Valor Novo. |
| **Gestão de Cursos** | Criar/Editar um curso (Ex: Técnico em Enfermagem). | O curso deve aparecer corretamente como opção ao criar novas turmas. |
| **Manutenção** | Bloquear o acesso de um usuário (IsActive = False). | O usuário bloqueado deve ser impedido de logar imediatamente. |

---

## 2. Visão da DIREÇÃO
*A Direção foca na gestão pedagógica e supervisão de resultados.*

| Funcionalidade | O que testar | Sucesso se... |
| :--- | :--- | :--- |
| **Gestão de Turmas** | Entrar em qualquer turma da escola. | Deve conseguir visualizar a lista de alunos e a matriz de notas. |
| **Supervisão de Notas** | Editar a nota de uma disciplina de um professor X. | O sistema deve permitir (Direção tem poder de auxílio em todas as matérias). |
| **Transferência** | Transferir um aluno de uma turma para outra. | O aluno deve sumir da turma A e aparecer na turma B com seu histórico. |
| **Visão Geral** | Acessar o Dashboard principal. | Deve ver os cards de "Total de Turmas", "Estudantes" e "Alertas de Risco". |
| **Aprovação de Questões**| Avaliar questões enviadas por professores. | Deve conseguir aprovar ou rejeitar (com feedback) as questões do banco. |

---

## 3. Visão do PROFESSOR
*O Professor foca no ensino, lançamento de dados e avaliações.*

| Funcionalidade | O que testar | Sucesso se... |
| :--- | :--- | :--- |
| **Lançamento de Notas** | Inserir notas nas disciplinas vinculadas a ele. | O sistema deve salvar e calcular a média automaticamente. |
| **Restrição de Acesso** | Tentar editar notas de uma disciplina que NÃO é dele. | O botão de "Salvar" deve estar oculto ou o acesso bloqueado. |
| **Quadro de Horários** | Acessar o horário da turma e ver o preenchimento. | Deve ver seu nome vinculado automaticamente às suas matérias. |
| **Gerador de Provas** | Gerar uma prova selecionando questões do banco. | O PDF deve sair com cabeçalho oficial e as questões escolhidas. |
| **Banco de Questões** | Cadastrar uma nova questão com imagem. | A questão deve entrar como "Pendente" aguardando a Direção. |
| **Mensagens** | Enviar um aviso para a Direção ou para uma Turma. | Os destinatários devem receber a notificação no painel deles. |

---

## 4. Visão do ESTUDANTE (Portal do Aluno)
*O ponto de consumo de informação do aluno.*

| Funcionalidade | O que testar | Sucesso se... |
| :--- | :--- | :--- |
| **Consulta de Notas** | Acompanhar o boletim em tempo real. | Notas lançadas pelo professor devem aparecer instantaneamente. |
| **Quadro de Horários** | Abrir o modal de horários no Portal. | Deve exibir o quadro compacto e organizado para leitura mobile. |
| **Análise de Risco** | Verificar se há alertas de "Baixo Desempenho". | O sistema deve destacar em vermelho disciplinas com média < 5.0. |
| **Navegação** | Usar os botões "Voltar" nas seções de Mensagens/Perfil. | A navegação deve ser fluida e não "relogar" o usuário. |

---

## 5. Funcionalidades Transversais (Todos os Roles)
| Funcionalidade | O que testar | Sucesso se... |
| :--- | :--- | :--- |
| **Sistema de Mensagens**| Enviar, ler e excluir mensagens. | O contador de "não lidas" deve atualizar corretamente. |
| **Responsividade** | Acessar o sistema pelo celular e pelo PC. | O layout deve se adaptar (Sidebar vira menu hambúrguer no mobile). |
| **Segurança** | Tentar acessar o dashboard sem estar logado (via URL). | O sistema deve redirecionar forçadamente para a página de Login. |

---

## 6. Verificações Técnicas de Saída (PDF/Impressão)
- [ ] O cabeçalho do CETEP/LNAB está centralizado e correto.
- [ ] O Gabarito Listrado aparece na primeira página da prova.
- [ ] A numeração de páginas (ex: 1 de 3) aparece no rodapé do PDF.
- [ ] O QR Code ou IDs de identificação estão legíveis (se aplicável).

---
**Ultima Atualização:** 17/02/2026
**Responsável pelo Plano:** Andressa Mirella
