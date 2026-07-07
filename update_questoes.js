const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/questoes/QuestoesClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add pagination state
content = content.replace(
  /const \[selectedIds, setSelectedIds\] = useState<string\[\]>\(\[\]\)/,
  `const [selectedIds, setSelectedIds] = useState<string[]>([])\n  const [currentPage, setCurrentPage] = useState(1)`
);

// 2. Add useEffect to reset page
content = content.replace(
  /useEffect\(\(\) => \{\n    const timer = setTimeout\(\(\) => \{/,
  `useEffect(() => {\n    setCurrentPage(1);\n  }, [filters]);\n\n  useEffect(() => {\n    const timer = setTimeout(() => {`
);

// 3. Define paginated questoes
content = content.replace(
  /const stripHtml = \(html: string\) => \{/,
  `const itemsPerPage = 20;\n  const totalPages = Math.ceil(questoes.length / itemsPerPage);\n  const paginatedQuestoes = questoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);\n\n  const stripHtml = (html: string) => {`
);

// 4. Update the map to use paginatedQuestoes
content = content.replace(
  /questoes\.map\(\(q: any\) => \(/,
  `paginatedQuestoes.map((q: any) => (`
);

// 5. Add Pagination Controls after the grid
const paginationJSX = `
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="flex items-center px-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">
              {currentPage} de {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Próxima
            </button>
          </div>
        )}

        {/* Modals */}
`;
content = content.replace(
  /\{\/\* Modals \*\/\}/,
  paginationJSX
);

// 6. Fix date format in card
content = content.replace(
  /<p><span className="font-semibold text-gray-900">Criado:<\/span> \{new Date\(q\.createdAt\)\.toLocaleDateString\('pt-BR', \{ month: 'short', day: 'numeric', year: 'numeric' \}\)\}<\/p>/,
  `<p><span className="font-semibold text-gray-900">Criado:</span> {new Date(q.createdAt).toLocaleString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>`
);

// 7. Fix Unidade badge in card header
// From: <span className="text-xs font-semibold text-gray-500">{q.unidade ? `${q.unidade}ª Unid.` : '12px'}</span>
// To: a colored badge
content = content.replace(
  /<span className="text-xs font-semibold text-gray-500">\{q\.unidade \? `\$\{q\.unidade\}ª Unid\.` : '12px'\}<\/span>/,
  `{q.unidade ? (
                      <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${q.unidade == 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                        {q.unidade}ª Unidade
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-500">Geral</span>
                    )}`
);

// 8. Add metrics above header
const metricsJSX = `
        {/* Metrics Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 flex items-center justify-center">
              <Search size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total no Banco</p>
              <p className="text-2xl font-black text-slate-800">{metrics?.totalAprovadas || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">Questões prontas para uso</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isAdmin ? "Total Aprovadas" : "Minhas Questões"}</p>
              <p className="text-2xl font-black text-slate-800">{isAdmin ? (metrics?.totalAprovadas || 0) : (metrics?.minhasQuestoes || 0)}</p>
              <p className="text-[10px] text-slate-400 font-medium">{isAdmin ? "Global no sistema" : "Enviadas por você"}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 group">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aguardando Revisão</p>
              <p className="text-2xl font-black text-slate-800">{metrics?.totalPendentes || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">Pendentes de aprovação</p>
            </div>
          </div>
        </div>

        {/* Header - EXACTLY AS IMAGE */}
`;
content = content.replace(
  /\{\/\* Header - EXACTLY AS IMAGE \*\/\}/,
  metricsJSX
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("update_questoes script finished");
