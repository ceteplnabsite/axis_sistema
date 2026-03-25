
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, CheckCircle2, XCircle, 
  Search, Mail, ChevronDown, ChevronUp, 
  Settings, ExternalLink, ShieldCheck, AlertCircle,
  Eye, Image as ImageIcon, X
} from 'lucide-react';
import Link from 'next/link';

export default function JogosAdminClient({ initialInscricoes, modalities, config }: any) {
  const [inscricoes, setInscricoes] = useState(initialInscricoes || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  const safeConfig = config || { minGrade: 6, minAttendance: 75, maxInfrequentPercent: 20 };

  const calculateEligibility = (member: any) => {
    const student = member?.student;
    if (!student) return { isEligible: false, mediaGeral: 0, infrequentPerc: 0, errors: ["Dados ausentes"] };

    const notas = student.notas || [];
    const mediaGeral = notas.length > 0 ? notas.reduce((acc: number, n: any) => acc + (n.nota || 0), 0) / notas.length : 0;
    const infrequentCount = notas.filter((n: any) => n.isDesistenteUnid1 || n.isDesistenteUnid2 || n.isDesistenteUnid3).length;
    const infrequentPerc = notas.length > 0 ? (infrequentCount / notas.length) * 100 : 0;

    const errors = [];
    if (mediaGeral < safeConfig.minGrade) errors.push(`Média ${mediaGeral.toFixed(1)} < ${safeConfig.minGrade}`);
    if (infrequentPerc > safeConfig.maxInfrequentPercent) errors.push(`Infreq ${infrequentPerc.toFixed(0)}% > ${safeConfig.maxInfrequentPercent}%`);

    return { isEligible: errors.length === 0, mediaGeral, infrequentPerc, errors };
  };

  const updateStatus = async (id: string, status: string, feedback: string) => {
    setUpdating(id);
    try {
      const res = await fetch('/api/jogos/admin/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, feedback })
      });
      if (res.ok) {
        setInscricoes(inscricoes.map((ins: any) => ins.id === id ? { ...ins, status, feedback } : ins));
      }
    } catch (e) { console.error(e); } finally { setUpdating(null); }
  };

  const filtered = (inscricoes || []).filter((ins: any) => {
    const teamName = ins.nome || ins.teamName || "";
    const modalityName = ins.modality?.nome || "";
    return teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           modalityName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleExpand = (id: string) => setExpandedTeam(expandedTeam === id ? null : id);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header com Link para Configuração */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Gestão dos Jogos</h1>
            <p className="text-slate-500 font-medium">{inscricoes.length} equipes inscritas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por time ou esporte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-64 text-slate-900 transition-all"
            />
          </div>
          <Link 
            href="/dashboard/jogos/config"
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 font-bold text-xs"
            title="Customizar Formulário e Regras"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Configurar</span>
          </Link>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ins: any) => {
          const isExpanded = expandedTeam === ins.id;
          return (
            <div key={ins.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col min-h-fit">
              
              {/* Equipe Header */}
              <div className="p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-lg tracking-wider">
                    {ins.modality?.nome || 'Esporte'}
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    ins.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    ins.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {ins.status === 'PENDING' || ins.status === 'Pendente' ? 'Pendente' : ins.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                  </div>
                </div>
                
                {/* Document Status Mini Badge */}
                {ins.status === 'APPROVED' && (
                  <div className="flex gap-1 mb-2">
                    {(() => {
                      const totalDocs = (ins.members || []).reduce((acc: number, m: any) => acc + (m.idFrontUrl ? 1 : 0) + (m.idBackUrl ? 1 : 0), 0);
                      const requiredDocs = (ins.members || []).length * 2;
                      const isComplete = totalDocs === requiredDocs;

                      return (
                        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                          isComplete ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          <ImageIcon size={10} /> {totalDocs}/{requiredDocs} RGs
                        </div>
                      );
                    })()}
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 truncate">"{ins.nome || ins.teamName}"</h3>
                <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {ins.contactEmail || 'Sem e-mail'}</div>
                  {ins.contactPhone && (
                    <div className="flex items-center gap-1.5">📞 {ins.contactPhone}</div>
                  )}
                </div>
              </div>

              {/* Botão de Expansão (Ver Detalhes) */}
              <button 
                onClick={() => toggleExpand(ins.id)}
                className={`mx-5 mb-4 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                {isExpanded ? 'Ocultar Atletas' : `Ver Atletas (${ins.members?.length || 0})`}
              </button>

              {/* Detalhes dos Atletas (Retrátil) */}
              <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 space-y-4 pt-2 border-t border-slate-50">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoria Automática</div>
                  {(ins.members || []).map((m: any) => {
                    const el = calculateEligibility(m);
                    return (
                      <div key={m.id} className="flex items-center justify-between group bg-slate-50/50 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${el.isEligible ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                          <div>
                            <div className="text-sm font-bold text-slate-700 leading-none mb-1">{m.student?.nome || 'Não cadastrado'}</div>
                            <div className="text-[10px] text-slate-400">{m.student?.turma?.nome || 'Unha Turma'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex flex-col items-end">
                              <span className={`text-[9px] font-bold ${el.mediaGeral < safeConfig.minGrade ? 'text-red-600' : 'text-slate-500'}`}>
                                {el.mediaGeral.toFixed(1)} média
                              </span>
                              <span className={`text-[9px] font-bold ${el.infrequentPerc > safeConfig.maxInfrequentPercent ? 'text-red-600' : 'text-slate-500'}`}>
                                {el.infrequentPerc.toFixed(0)}% infreq.
                              </span>
                           </div>
                           
                           {/* Doc Viewers */}
                           <div className="flex gap-1">
                             {m.idFrontUrl || m.idBackUrl ? (
                               <button 
                                 onClick={() => setViewingDoc({ member: m, team: ins })}
                                 className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                 title="Visualizar Documentos"
                               >
                                 <Eye size={14} />
                               </button>
                             ) : (
                               <div className="p-1.5 bg-slate-50 text-slate-300 rounded-lg" title="Sem documentos">
                                 <Eye size={14} />
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                      Comunicação Rápida (Problemas na Equipe?)
                      {ins.status === 'APPROVED' && (
                        <a 
                          href={`/jogos/${ins.id}/documentos`} 
                          target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" /> Ver Documentos RGs
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {ins.contactPhone && (
                        <a 
                          target="_blank" rel="noopener noreferrer"
                          href={`https://wa.me/55${ins.contactPhone.replace(/\D/g, '')}?text=Ol%C3%A1,%20l%C3%ADder%20da%20equipe%20*${encodeURIComponent(ins.nome)}*!%0ANotamos%20algumas%20pend%C3%AAncias%20de%20esporte/(nota/frequ%C3%AAncia)%20em%20membros%20da%20sua%20inscri%C3%A7%C3%A3o.%20Poderia%20verificar?`}
                          className="flex-1 py-3 bg-[#e8f7ed] text-[#128c7e] rounded-xl text-[11px] font-black uppercase text-center border border-[#d1f4da] hover:bg-[#d1f4da] transition-all"
                        >
                          Chamar no WhatsApp
                        </a>
                      )}
                      <a 
                        href={`mailto:${ins.contactEmail}?subject=Pend%C3%AAncia%20Inscri%C3%A7%C3%A3o%20-%20${encodeURIComponent(ins.nome)}&body=Ol%C3%A1.%20Notamos%20irregularidades%20na%20inscri%C3%A7%C3%A3o%20da%20equipe.`}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase text-center border border-slate-200 hover:bg-slate-200 transition-all"
                      >
                        Enviar E-mail
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions (Sempre visível se expandido ou se pendente) */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                  disabled={updating === ins.id}
                  onClick={() => updateStatus(ins.id, 'APPROVED', '')}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                </button>
                <button 
                  disabled={updating === ins.id}
                  onClick={() => {
                    const reason = prompt('Motivo da rejeição:');
                    if (reason) updateStatus(ins.id, 'REJECTED', reason);
                  }}
                  className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewingDoc.member.student?.nome}</h2>
                <p className="text-xs text-slate-500 font-medium">Documentos de Identidade • Equipe {viewingDoc.team.nome}</p>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Front */}
                <div className="space-y-3">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Frente do RG</div>
                  {viewingDoc.member.idFrontUrl ? (
                     <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                       <img 
                        src={viewingDoc.member.idFrontUrl} 
                        alt="Frente do RG" 
                        className="w-full h-auto object-contain rounded-lg active:scale-150 transition-transform cursor-zoom-in"
                       />
                     </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-white text-slate-300 italic text-sm">
                      Não enviado
                    </div>
                  )}
                </div>

                {/* Back */}
                <div className="space-y-3">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Verso do RG</div>
                  {viewingDoc.member.idBackUrl ? (
                     <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                       <img 
                        src={viewingDoc.member.idBackUrl} 
                        alt="Verso do RG" 
                        className="w-full h-auto object-contain rounded-lg active:scale-150 transition-transform cursor-zoom-in"
                       />
                     </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-white text-slate-300 italic text-sm">
                      Não enviado
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 text-center">
               <p className="text-[10px] text-slate-400 font-medium italic">Dica: No computador, clique e segure na imagem para ampliar temporariamente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
