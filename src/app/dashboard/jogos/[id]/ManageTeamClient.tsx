'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, Trophy, Users, CheckCircle2, XCircle, 
  Mail, Phone, ShieldCheck, AlertCircle, Eye, 
  MessageSquare, ExternalLink, X, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

export default function ManageTeamClient({ team, config }: any) {
  const [status, setStatus] = useState(team.status);
  const [updating, setUpdating] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState('');

  const calculateEligibility = (member: any) => {
    const student = member?.student;
    if (!student) return { isEligible: false, mediaGeral: 0, passingPerc: 0, infrequentPerc: 0, errors: ["Dados ausentes"] };

    const notas = student.notas || [];
    const validNotas = notas.filter((n: any) => n.nota1 !== null && n.nota1 !== undefined);
    const totalSubjects = validNotas.length;
    const passingSubjects = validNotas.filter((n: any) => Number(n.nota1) >= 5).length;
    const passingPerc = totalSubjects > 0 ? (passingSubjects / totalSubjects) * 100 : 0;
    
    const totalAllSubjects = notas.length;
    const infrequentCount = notas.filter((n: any) => n.isDesistenteUnid1 || n.isDesistenteUnid2 || n.isDesistenteUnid3).length;
    const infrequentPerc = totalAllSubjects > 0 ? (infrequentCount / totalAllSubjects) * 100 : 0;

    const errors = [];
    if (passingPerc < 75) errors.push(`Aprovado em ${passingPerc.toFixed(0)}% das disc. (Mínimo 75%)`);
    if (infrequentPerc > config.maxInfrequentPercent) errors.push(`Infreq ${infrequentPerc.toFixed(0)}% > ${config.maxInfrequentPercent}%`);

    return { isEligible: errors.length === 0, mediaGeral: passingPerc, passingPerc, infrequentPerc, errors };
  };

  const updateStatus = async (newStatus: string, feedback: string = '', reasons: string[] = [], irregularStudents: any[] = []) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/jogos/admin/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: team.id, status: newStatus, feedback, reasons, irregularStudents })
      });
      if (res.ok) {
        setStatus(newStatus);
        setShowRejectModal(false);
        alert(`Status atualizado para: ${newStatus === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}`);
      }
    } catch (e) { console.error(e); } finally { setUpdating(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/jogos"
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Gerenciar Equipe</h1>
            <p className="text-sm font-medium text-slate-500">Detalhes da inscrição e auditoria de atletas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
            }`}>
                {status === 'PENDING' || status === 'Pendente' ? '🔴 Aguardando Revisão' : status === 'APPROVED' ? '🟢 Equipe Aprovada' : '🚫 Inscrição Indeferida'}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna 1: Informações do Time */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
               <Trophy className="w-6 h-6 text-indigo-600" />
               <h2 className="font-bold text-slate-800">Dados da Equipe</h2>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nome do Time</label>
                  <p className="text-xl font-bold text-slate-900 uppercase">"{team.nome}"</p>
               </div>
               <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Modalidade</label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-sm font-bold">{team.modality?.nome}</span>
                  </div>
               </div>
               <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <Mail size={16} className="text-slate-400" /> {team.contactEmail}
                  </div>
                  {team.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium font-mono">
                      <Phone size={16} className="text-slate-400" /> {team.contactPhone}
                    </div>
                  )}
               </div>
               
               <div className="pt-4 space-y-2 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase">Comunicação Rápida</h4>
                  <div className="grid grid-cols-1 gap-2">
                      {team.contactPhone && (
                        <a 
                          target="_blank" rel="noopener noreferrer"
                          href={`https://wa.me/55${team.contactPhone.replace(/\D/g, '')}?text=Ol%C3%A1,%20l%C3%ADder%20da%20equipe%20*${encodeURIComponent(team.nome)}*!%20Estamos%20revisando%20sua%20inscri%C3%A7%C3%A3o...`}
                          className="flex items-center justify-center gap-2 py-3 bg-[#e8f7ed] text-[#128c7e] rounded-2xl text-xs font-black uppercase hover:bg-[#d1f4da] transition-all"
                        >
                          <MessageSquare size={16} /> Chamar no Whats
                        </a>
                      )}
                      <a 
                        href={`mailto:${team.contactEmail}`}
                        className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all border border-slate-200"
                      >
                        <Mail size={16} /> Enviar E-mail
                      </a>
                  </div>
               </div>
            </div>
          </div>

          {/* Card de Ações Finais */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200 space-y-4">
             <h3 className="text-white font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" /> Decisão Final
             </h3>
             <p className="text-slate-400 text-xs font-medium">Após aprovar, o líder receberá um e-mail com o link para envio dos documentos dos atletas.</p>
             
             <div className="grid grid-cols-1 gap-3">
                <button 
                  disabled={updating}
                  onClick={() => updateStatus('APPROVED')}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Aprovar Equipe
                </button>
                <button 
                  disabled={updating}
                  onClick={() => setShowRejectModal(true)}
                  className="w-full py-3.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Indeferir Inscrição
                </button>
             </div>
          </div>
        </div>

        {/* Coluna 2 e 3: Auditoria de Atletas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Users size={20} />
                   </div>
                   <h2 className="font-bold text-slate-800 uppercase text-sm tracking-widest">Auditoria de Atletas ({team.members?.length || 0})</h2>
                </div>
                
                {status === 'APPROVED' && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 animate-pulse">
                    <ShieldCheck size={12} /> Auditado pelo Sistema
                  </div>
                )}
             </div>

             <div className="divide-y divide-slate-100">
                {(team.members || []).map((m: any) => {
                  const el = calculateEligibility(m);
                  return (
                    <div key={m.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${el.isEligible ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-red-500 animate-pulse'}`} />
                          <div>
                             <div className="flex items-center gap-2">
                               <h3 className="font-bold text-slate-900">{m.student?.nome}</h3>
                               {m.isLeader && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-black rounded uppercase">Líder</span>}
                             </div>
                             <p className="text-xs text-slate-500 font-medium">{m.student?.matricula} • {m.student?.turma?.nome}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                          {/* Acadêmico */}
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                               <span className="text-[9px] uppercase font-black text-slate-400">% Disc. OK</span>
                               <span className={`text-sm font-black ${el.passingPerc < 75 ? 'text-red-600' : 'text-slate-700'}`}>
                                 {el.passingPerc.toFixed(0)}%
                               </span>
                            </div>
                            <div className="flex flex-col items-center">
                               <span className="text-[9px] uppercase font-black text-slate-400">Frequência</span>
                               <span className={`text-sm font-black ${el.infrequentPerc > config.maxInfrequentPercent ? 'text-red-600' : 'text-slate-700'}`}>
                                 {(100 - el.infrequentPerc).toFixed(0)}%
                               </span>
                            </div>
                          </div>

                          {/* Documentação */}
                          <div className="flex items-center gap-2 pl-6 border-l border-slate-100">
                             <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Doc RGs</span>
                                <div className="flex gap-1.5">
                                   <div className={`w-3 h-3 rounded-sm ${m.idFrontUrl ? 'bg-emerald-500' : 'bg-slate-200'}`} title="Frente" />
                                   <div className={`w-3 h-3 rounded-sm ${m.idBackUrl ? 'bg-emerald-500' : 'bg-slate-200'}`} title="Verso" />
                                </div>
                             </div>
                             
                             {(m.idFrontUrl || m.idBackUrl) && (
                               <button 
                                 onClick={() => setViewingDoc({ member: m, team })}
                                 className="p-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl hover:border-indigo-600 transition-all shadow-sm ml-2"
                               >
                                 <Eye size={18} />
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
             <div className="space-y-1">
                <h4 className="font-bold text-amber-900 text-sm">Regra de Elegibilidade Acadêmica</h4>
                <p className="text-amber-800/80 text-xs font-medium leading-relaxed">
                  Para competir, o estudante deve ter sido <strong className="font-extrabold underline">aprovado em pelo menos 75% das disciplinas</strong> do seu curso no período letivo. Além disso, a frequência escolar mínima deve ser de <strong>{100 - config.maxInfrequentPercent}%</strong>.
                </p>
             </div>
          </div>
        </div>
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
                <div className="space-y-3 text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Frente do RG</div>
                  {viewingDoc.member.idFrontUrl ? (
                     <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 overflow-hidden group">
                       <img 
                        src={viewingDoc.member.idFrontUrl} 
                        alt="Frente do RG" 
                        className="w-full h-auto object-contain rounded-lg active:scale-150 transition-transform cursor-zoom-in"
                       />
                       <a href={viewingDoc.member.idFrontUrl} target="_blank" className="mt-2 text-[10px] font-black text-indigo-600 uppercase flex items-center justify-center gap-1">
                          <ExternalLink size={10} /> Abrir em tamanho real
                       </a>
                     </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-white text-slate-300 italic text-sm">
                      Não enviado
                    </div>
                  )}
                </div>

                {/* Back */}
                <div className="space-y-3 text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verso do RG</div>
                  {viewingDoc.member.idBackUrl ? (
                     <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 overflow-hidden group">
                       <img 
                        src={viewingDoc.member.idBackUrl} 
                        alt="Verso do RG" 
                        className="w-full h-auto object-contain rounded-lg active:scale-150 transition-transform cursor-zoom-in"
                       />
                       <a href={viewingDoc.member.idBackUrl} target="_blank" className="mt-2 text-[10px] font-black text-indigo-600 uppercase flex items-center justify-center gap-1">
                          <ExternalLink size={10} /> Abrir em tamanho real
                       </a>
                     </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-white text-slate-300 italic text-sm">
                      Não enviado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg">Indeferir Inscrição</h3>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Alunos Irregulares */}
              {(() => {
                const irregulars = team.members?.map((m: any) => {
                  const el = calculateEligibility(m);
                  if (!el.isEligible || (!m.idFrontUrl && !m.idBackUrl)) {
                    const docsMissing = (!m.idFrontUrl && !m.idBackUrl) ? 'Faltam RGs' : '';
                    const acadMissing = el.errors.join(' | ');
                    return { name: m.student?.nome, info: [acadMissing, docsMissing].filter(Boolean).join(' - ') };
                  }
                  return null;
                }).filter(Boolean) || [];

                if (irregulars.length === 0) return null;
                
                return (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <h4 className="text-sm font-bold text-red-900 mb-3 uppercase tracking-wider">Atletas Irregulares ({irregulars.length})</h4>
                    <div className="space-y-2">
                      {irregulars.map((irr: any, i: number) => (
                        <div key={i} className="text-xs text-red-700 bg-white/60 p-2 rounded-lg border border-red-100/50">
                          <strong className="block mb-0.5">{irr.name}</strong>
                          <span className="opacity-80">{irr.info}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Motivos */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Motivos do Indeferimento</h4>
                {[
                  'Alunos não atingiram o critério acadêmico (Notas/Frequência)',
                  'Documentação (RG) pendente ou inválida',
                  'Inscrição fora do prazo estabelecido',
                  'Falta de representatividade exigida para a modalidade'
                ].map((reason, idx) => (
                  <label key={idx} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      checked={selectedReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedReasons([...selectedReasons, reason]);
                        else setSelectedReasons(selectedReasons.filter(r => r !== reason));
                      }}
                    />
                    <span className="text-sm text-slate-700">{reason}</span>
                  </label>
                ))}
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Observações Extras</h4>
                <textarea
                  className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all min-h-[100px] bg-slate-50 focus:bg-white resize-none"
                  placeholder="Escreva algum detalhe extra para o líder da equipe (opcional)..."
                  value={customFeedback}
                  onChange={(e) => setCustomFeedback(e.target.value)}
                />
              </div>

              {/* Ações */}
              <button 
                disabled={updating}
                onClick={() => {
                  const irregulars = team.members?.map((m: any) => {
                    const el = calculateEligibility(m);
                    if (!el.isEligible || (!m.idFrontUrl && !m.idBackUrl)) {
                      const docsMissing = (!m.idFrontUrl && !m.idBackUrl) ? 'Faltam RGs' : '';
                      const acadMissing = el.errors.join(' | ');
                      return { name: m.student?.nome, info: [acadMissing, docsMissing].filter(Boolean).join(' - ') };
                    }
                    return null;
                  }).filter(Boolean) || [];
                  
                  updateStatus('REJECTED', customFeedback, selectedReasons, irregulars);
                }}
                className="w-full py-4 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {updating ? 'Enviando...' : 'Confirmar Indeferimento e Notificar Líder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
