const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/questoes/QuestoesClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnRegex = /return \(\s*<div className="min-h-screen bg-slate-50 pb-20 space-y-10">[\s\S]*?\)\n}\n/m;

const newJSX = `
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <TeacherTipsModal 
        storageKey="seen_tips_questoes"
        title="Dicas do Banco"
        tips={questaoTips}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        
        {/* Header - EXACTLY AS IMAGE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Banco de Questões</h1>
          <button
            onClick={() => { setEditingQuestao(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all active:scale-95"
          >
            <Plus size={18} />
            Nova Questão
          </button>
        </div>

        {/* Filters - EXACTLY AS IMAGE (Labels above fields) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mb-10">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Pesquisar</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar questões..."
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Disciplina</label>
            <div className="relative">
              <select 
                value={filters.disciplinaId}
                onChange={(e) => setFilters({...filters, disciplinaId: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
              >
                <option value="">Todas as Disciplinas</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Turma</label>
            <div className="relative">
              <select 
                value={filters.turmaId}
                onChange={(e) => setFilters({...filters, turmaId: e.target.value, disciplinaId: ''})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
              >
                <option value="">Todas as Turmas</option>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Status</label>
            <div className="relative">
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
              >
                <option value="">Todos os Status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADA">Aprovada</option>
                <option value="REJEITADA">Rejeitada</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          
          {/* Secondary Row for extra filters */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Professor</label>
              <div className="relative">
                <select
                  value={filters.professorId}
                  onChange={(e) => setFilters({...filters, professorId: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
                >
                  <option value="">Todos os Professores</option>
                  {professores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Unidade</label>
            <div className="relative">
              <select 
                value={filters.unidade || ''}
                onChange={(e) => setFilters({...filters, unidade: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
              >
                <option value="">Todas as Unidades</option>
                <option value="1">1ª Unidade</option>
                <option value="2">2ª Unidade</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Tipo</label>
            <div className="relative">
              <select 
                value={filters.tipo || ''}
                onChange={(e) => setFilters({...filters, tipo: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none"
              >
                <option value="">Todos os Tipos</option>
                <option value="NORMAL">Normal</option>
                <option value="RECUPERACAO">Recuperação</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {(filters.search || filters.turmaId || filters.disciplinaId || filters.status || filters.unidade || filters.tipo || filters.professorId) && (
            <div className="flex items-end">
              <button 
                onClick={() => setFilters({ turmaId: '', disciplinaId: '', status: '', unidade: '', tipo: '', search: '', professorId: '' })}
                className="w-full px-3 py-2.5 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && isAdmin && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3 pr-6 border-r border-gray-700">
              <div className="bg-blue-600 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-medium">Selecionadas</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkStatusUpdate('APROVADA')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold transition-all"
              >
                <CheckCircle2 size={16} /> Aprovar
              </button>
              <button 
                onClick={() => {
                  const fb = prompt('Motivo do veto em massa:')
                  if (fb) handleBulkStatusUpdate('REJEITADA', fb)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold transition-all"
              >
                <X size={16} /> Rejeitar
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Carregando...</p>
            </div>
          ) : questoes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">Nenhuma questão encontrada com estes filtros.</p>
            </div>
          ) : (
            questoes.map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex flex-col h-full relative">
                  {/* Admin Checkbox */}
                  {isAdmin && (
                    <div className="absolute top-5 left-5 z-10">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, q.id])
                          else setSelectedIds(selectedIds.filter(id => id !== q.id))
                        }}
                        className="w-4 h-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Card Header */}
                  <div className={"flex justify-between items-center mb-4 " + (isAdmin ? "ml-8" : "")}>
                    <span className="text-xs font-semibold text-gray-500">#{q.id.slice(0,6).toUpperCase()}</span>
                    <span className="text-xs font-semibold text-gray-500">{q.unidade ? \`\${q.unidade}ª Unid.\` : '12px'}</span>
                  </div>
                  
                  {/* Question Title */}
                  <div className="mb-6 flex-1">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-3">
                      {stripHtml(q.enunciado) || "Questão sem texto"}
                    </h3>
                  </div>
                  
                  {/* Metadata */}
                  <div className="space-y-1.5 mb-6 text-sm text-gray-600">
                    <p><span className="font-semibold text-gray-900">Disciplina:</span> {q.disciplina?.nome || 'Geral'}</p>
                    <p className="truncate"><span className="font-semibold text-gray-900">Turma:</span> {q.turmas?.map(t=>t.nome).join(', ') || 'Nenhuma'}</p>
                    <p className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900">Status:</span> 
                      {q.status === 'APROVADA' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Aprovada</span>}
                      {q.status === 'PENDENTE' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Pendente</span>}
                      {q.status === 'REJEITADA' && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Rejeitada</span>}
                    </p>
                    <p className="truncate"><span className="font-semibold text-gray-900">Autor:</span> {q.professor?.name}</p>
                    <p><span className="font-semibold text-gray-900">Criado:</span> {new Date(q.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  
                  {/* Action Icons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    {(!isAdmin || q.professorId === user.id) && (
                      <button onClick={() => { setEditingQuestao(q); setShowForm(true); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button onClick={() => setPreviewQuestao(q)} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Visualizar">
                      <Eye size={16} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(q.id)} className="text-gray-400 hover:text-rose-600 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <QuestaoForm 
            questao={editingQuestao}
            onClose={() => setShowForm(false)}
            onSuccess={() => { 
              setShowForm(false); 
              fetchQuestoes(); 
              router.refresh();
            }}
            turmas={turmas}
            disciplinas={disciplinas}
          />
        )}

        <QuestaoPreviewModal 
          questao={previewQuestao}
          onClose={() => setPreviewQuestao(null)}
        />
      </div>
    </div>
  )
}
`

content = content.replace(returnRegex, newJSX);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replacement done");
