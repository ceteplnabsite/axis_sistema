// Importação de notas a partir da tela "Lançar Notas para Avaliações das Unidades" do SIGEduc.
// Sem dependências de servidor: usado pela página de importação (client) e pelas server actions.

export const ORIGEM_SIGEDUC = 'https://sigeduc.educacao.ba.gov.br'
export const TIPO_MENSAGEM = 'axis-sigeduc'
export const TIPO_RECEBIDO = 'axis-sigeduc-recebido'

export type LinhaSigeduc = { nome: string; nota: string }
export type DadosSigeduc = {
  fonte: 'SIGEduc'
  versao: 1
  turma: string
  componente: string
  /** "1" | "2" | "3" → linhas daquela unidade (nota '' = campo vazio no SIGEduc) */
  unidades: Partial<Record<'1' | '2' | '3', LinhaSigeduc[]>>
}

/** Confere o formato do que chegou do navegador (nunca confiar no que vem de outra página) */
export function validarDadosSigeduc(x: unknown): DadosSigeduc | null {
  if (!x || typeof x !== 'object') return null
  const d = x as Record<string, unknown>
  if (d.fonte !== 'SIGEduc' || d.versao !== 1) return null
  if (typeof d.turma !== 'string' || typeof d.componente !== 'string' || d.turma.length > 300 || d.componente.length > 400) return null
  if (!d.unidades || typeof d.unidades !== 'object') return null
  const unidades: DadosSigeduc['unidades'] = {}
  for (const u of ['1', '2', '3'] as const) {
    const linhas = (d.unidades as Record<string, unknown>)[u]
    if (linhas === undefined) continue
    if (!Array.isArray(linhas) || linhas.length > 300) return null
    const ok: LinhaSigeduc[] = []
    for (const l of linhas) {
      if (!l || typeof l !== 'object') return null
      const { nome, nota } = l as Record<string, unknown>
      if (typeof nome !== 'string' || typeof nota !== 'string' || nome.length > 200) return null
      if (nota.trim() !== '' && !/^\d{1,2}([.,]\d{1,2})?$/.test(nota.trim())) return null
      ok.push({ nome: nome.trim(), nota: nota.trim() })
    }
    unidades[u] = ok
  }
  if (!Object.keys(unidades).length) return null
  return { fonte: 'SIGEduc', versao: 1, turma: d.turma.trim(), componente: d.componente.trim(), unidades }
}

/** "ANA BEATRIZ CERQUEIRA DOS SANTOS" e "Ana Beatriz Cerqueira dos Santos" viram a mesma chave */
export const normalizarNome = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const LIGACOES = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'])
/** Chave mais tolerante: sem "de/da/dos/e" (algumas listas escrevem sem elas) */
export const nomeSemLigacoes = (s: string) => normalizarNome(s).split(' ').filter(p => !LIGACOES.has(p)).join(' ')

/** Nota do SIGEduc ("4.7", "6,8", "") → número ou null (vazio) */
export const notaSigeduc = (s: string) => (s.trim() === '' ? null : Math.round(parseFloat(s.replace(',', '.')) * 10) / 10)

/** Código da turma no texto do SIGEduc: "... 3ª SÉRIE - INFMAT3SA / MATUTINO" → "INFMAT3SA" */
export function codigoTurmaSigeduc(turma: string) {
  const m = turma.match(/-\s*([A-Z0-9]+)\s*\/\s*\w+\s*$/i)
  return m ? m[1].toUpperCase() : turma
}

const VAZIAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM', 'A', 'O', 'PARA', 'COM', 'NA', 'NO'])
const palavras = (s: string) => new Set(normalizarNome(s).split(' ').filter(p => p.length > 1 && !VAZIAS.has(p)))

/** Quanto o nome da disciplina do Áxis se parece com o componente do SIGEduc (0 a 1) */
export function semelhancaComponente(disciplinaAxis: string, componenteSigeduc: string) {
  const a = palavras(disciplinaAxis), b = palavras(componenteSigeduc)
  if (!a.size) return 0
  let comuns = 0
  for (const p of a) if (b.has(p)) comuns++
  return comuns / a.size
}

/**
 * Código do botão "Enviar ao Áxis" (favorito). Roda na página do SIGEduc: só LÊ a tabela
 * (nome + "Nota da Unidade" de cada aba) e manda para a aba do Áxis por postMessage.
 * Não clica em nada e não altera nada no SIGEduc.
 */
export function codigoBotaoSigeduc(origemAxis: string) {
  const js = `(()=>{const AX=${JSON.stringify(origemAxis)};
const tit=t=>{for(const td of document.querySelectorAll('td.titulo'))if(td.textContent.trim().startsWith(t))return(td.nextElementSibling&&td.nextElementSibling.textContent||'').replace(/\\s+/g,' ').trim();return''};
const unidades={};
document.querySelectorAll('input.nota').forEach(i=>{const m=(i.className||'').match(/\\bn([1-3])\\b/);if(!m)return;const tr=i.closest('tr');const el=tr&&tr.querySelector('.nome-estudante-com-legendas');if(!el)return;const d=el.querySelector('div')||el;let nome='';d.childNodes.forEach(n=>{if(n.nodeType===3)nome+=n.textContent});nome=nome.replace(/\\s+/g,' ').trim();if(!nome)return;(unidades[m[1]]=unidades[m[1]]||[]).push({nome,nota:(i.value||'').trim()})});
if(!Object.keys(unidades).length){alert('Áxis: abra no SIGEduc a tela "Lançar Notas para Avaliações das Unidades" de uma turma e clique de novo.');return}
const dados={fonte:'SIGEduc',versao:1,turma:tit('Turma:'),componente:tit('Componente:'),unidades};
const w=window.open(AX+'/dashboard/notas/importar-sigeduc','axis_sigeduc');
if(!w){alert('Áxis: o navegador bloqueou a nova aba. Permita pop-ups para o SIGEduc e clique de novo.');return}
let n=0;const iv=setInterval(()=>{if(++n>300){clearInterval(iv);return}try{w.postMessage({tipo:${JSON.stringify(TIPO_MENSAGEM)},dados},AX)}catch(e){}},1000);
window.addEventListener('message',e=>{if(e.origin===AX&&e.data&&e.data.tipo===${JSON.stringify(TIPO_RECEBIDO)})clearInterval(iv)});})()`
  return 'javascript:' + encodeURIComponent(js.replace(/\n/g, ''))
}

/** Diferença (em pontos) entre a nota do Áxis e a do SIGEduc a partir da qual a importação alerta o professor */
export const DIFERENCA_GRANDE = 2

export type ResultadoCasamento = { matricula: string } | { ambiguo: true } | null

/** Estudante para comparar nomes: `nome` (o que o Áxis mostra) e os outros nomes da mesma pessoa */
export type AlunoParaCasar = { matricula: string; nome: string; nomesAlternativos?: string[] | null }

/** Todos os nomes pelos quais o estudante pode aparecer no SIGEduc (sem repetir) */
export const nomesDoAluno = (a: AlunoParaCasar) => [...new Set([a.nome, ...(a.nomesAlternativos ?? [])].filter(Boolean))]

/**
 * Liga cada nome do SIGEduc a um estudante do Áxis SEM cruzar pessoas diferentes:
 * 1) nome exato (sem acentos/maiúsculas) — só vale se for único nos DOIS lados;
 * 2) sem "de/da/dos/e" — só para quem sobrou e, de novo, único nos dois lados;
 * cada estudante do Áxis recebe no máximo um nome. Qualquer dúvida vira "ambíguo" (nunca é aplicado).
 * Vale o nome do Áxis e também os outros nomes guardados (nome de registro, nome anterior),
 * para reconhecer quem usa nome social ou trocou de nome.
 */
export function casarNomes(nomesSigeduc: string[], alunos: AlunoParaCasar[]): Map<string, ResultadoCasamento> {
  const res = new Map<string, ResultadoCasamento>()
  const unicos = [...new Set(nomesSigeduc)]
  const usados = new Set<string>()
  for (const [passo, chave] of [[1, normalizarNome], [2, nomeSemLigacoes]] as const) {
    const pendentes = unicos.filter(n => !res.has(n) || (passo === 2 && res.get(n) === null))
    const sig = new Map<string, number>()
    for (const n of pendentes) sig.set(chave(n), (sig.get(chave(n)) ?? 0) + 1)
    // chave do nome → matrículas (uma pessoa conta uma vez, mesmo com dois nomes iguais)
    const ax = new Map<string, Set<string>>()
    for (const a of alunos) {
      if (usados.has(a.matricula)) continue
      for (const nome of nomesDoAluno(a)) {
        const k = chave(nome)
        if (!ax.has(k)) ax.set(k, new Set())
        ax.get(k)!.add(a.matricula)
      }
    }
    for (const n of pendentes) {
      const k = chave(n)
      const doAxis = [...(ax.get(k) ?? [])], doSig = sig.get(k) ?? 0
      if (doAxis.length === 1 && doSig === 1 && !usados.has(doAxis[0])) { res.set(n, { matricula: doAxis[0] }); usados.add(doAxis[0]) }
      else if (doAxis.length > 1 || (doAxis.length === 1 && doSig > 1)) res.set(n, { ambiguo: true })
      else if (!res.has(n)) res.set(n, null)
    }
  }
  return res
}
