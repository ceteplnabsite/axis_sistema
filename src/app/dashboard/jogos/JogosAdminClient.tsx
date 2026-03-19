
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, CheckCircle2, XCircle, 
  Search, Mail, ChevronDown, ChevronUp, 
  Settings, ExternalLink, ShieldCheck, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function JogosAdminClient({ initialInscricoes, modalities, config }: any) {
  const [inscricoes, setInscricoes] = useState(initialInscricoes || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

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
                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 truncate">"{ins.nome || ins.teamName}"</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Mail className="w-3.5 h-3.5" /> {ins.contactEmail || 'Sem contato'}
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
                        <div className="flex flex-col items-end">
                           <span className={`text-[9px] font-bold ${el.mediaGeral < safeConfig.minGrade ? 'text-red-600' : 'text-slate-500'}`}>
                             {el.mediaGeral.toFixed(1)} média
                           </span>
                           <span className={`text-[9px] font-bold ${el.infrequentPerc > safeConfig.maxInfrequentPercent ? 'text-red-600' : 'text-slate-500'}`}>
                             {el.infrequentPerc.toFixed(0)}% infreq.
                           </span>
                        </div>
                      </div>
                    );
                  })}
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
    </div>
  );
}
