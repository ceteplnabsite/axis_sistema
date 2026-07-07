const fs = require('fs');
const path = require('path');

// 1. UPDATE QuestoesClient.tsx
const clientPath = path.join(__dirname, 'src/app/dashboard/questoes/QuestoesClient.tsx');
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Replace metrics + header with inline metrics
const oldMetricsRegex = /\{\/\* Metrics Blocks \*\/\}[\s\S]*?<h1 className="text-3xl font-bold text-gray-900">Banco de Questões<\/h1>/m;
const newHeaderAndMetrics = `
        {/* Header with Inline Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold text-gray-900">Banco de Questões</h1>
            <div className="hidden lg:flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-semibold uppercase">Total:</span>
                <span className="text-sm font-bold text-gray-900">{metrics?.totalAprovadas || 0}</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 font-semibold uppercase">{isAdmin ? "Aprovadas:" : "Minhas:"}</span>
                <span className="text-sm font-bold text-emerald-700">{isAdmin ? (metrics?.totalAprovadas || 0) : (metrics?.minhasQuestoes || 0)}</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 font-semibold uppercase">Pendentes:</span>
                <span className="text-sm font-bold text-amber-700">{metrics?.totalPendentes || 0}</span>
              </div>
            </div>
          </div>
`;
clientContent = clientContent.replace(oldMetricsRegex, newHeaderAndMetrics);

// Fix Disciplina Mapping and Unique Code in card
clientContent = clientContent.replace(
  /<span className="text-xs font-semibold text-gray-500">#\{q\.id\.slice\(0,6\)\.toUpperCase\(\)\}<\/span>/,
  `<span className="text-sm font-semibold text-slate-700">#CMRB{q.id.slice(-4).toUpperCase()}</span>`
);

clientContent = clientContent.replace(
  /<p><span className="font-semibold text-gray-900">Disciplina:<\/span> \{q\.disciplina\?\.nome \|\| 'Geral'\}<\/p>/,
  `<p className="truncate"><span className="font-semibold text-gray-900">Disciplina:</span> {q.disciplinas?.map((d: any)=>d.nome).join(', ') || 'Geral'}</p>`
);

fs.writeFileSync(clientPath, clientContent, 'utf8');

// 2. UPDATE QuestaoPreviewModal.tsx
const modalPath = path.join(__dirname, 'src/app/dashboard/questoes/QuestaoPreviewModal.tsx');
let modalContent = fs.readFileSync(modalPath, 'utf8');

// Highlight correct alternative in green
const oldAltRegex = /<div key=\{letter\} className="flex gap-3 relative">/;
const newAltRegex = `<div key={letter} className={\`flex gap-3 relative \${questao.correta === letter ? 'bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 text-emerald-900' : 'py-2'}\`}>`;

modalContent = modalContent.replace(oldAltRegex, newAltRegex);
modalContent = modalContent.replace(oldAltRegex, newAltRegex); // Do for all in map if it was globally matched, but it's just one map block
modalContent = modalContent.replace(oldAltRegex, newAltRegex);
modalContent = modalContent.replace(oldAltRegex, newAltRegex);
modalContent = modalContent.replace(oldAltRegex, newAltRegex); // run 5 times just in case for literal string replace

fs.writeFileSync(modalPath, modalContent, 'utf8');
console.log("update_questoes2 script finished");
