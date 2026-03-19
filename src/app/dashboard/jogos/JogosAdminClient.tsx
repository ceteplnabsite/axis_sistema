
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, CheckCircle2, XCircle, 
  Clock, Filter, ShieldCheck, ShieldAlert,
  ChevronDown, Search, Mail, Settings, Save
} from 'lucide-react';

export default function JogosAdminClient({ initialInscricoes, modalities, config }: any) {
  const [inscricoes, setInscricoes] = useState(initialInscricoes || []);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Valores padrão de segurança para config
  const safeConfig = config || { minGrade: 6, minAttendance: 75, maxInfrequentPercent: 20 };

  const calculateEligibility = (member: any) => {
    const student = member?.student;
    
    if (!student) {
      return { isEligible: false, mediaGeral: 0, infrequentPerc: 0, errors: ["Dados do estudante ausentes"] };
    }

    const notas = student.notas || [];
    
    // Média Geral
    const mediaGeral = notas.length > 0
      ? notas.reduce((acc: number, n: any) => acc + (n.nota || 0), 0) / notas.length
      : 0;
    
    // Infrequência
    const infrequentCount = notas.filter((n: any) => 
      n.isDesistenteUnid1 || n.isDesistenteUnid2 || n.isDesistenteUnid3
    ).length;
    
    const totalDisciplines = notas.length;
    const infrequentPerc = totalDisciplines > 0 ? (infrequentCount / totalDisciplines) * 100 : 0;

    const errors = [];
    if (mediaGeral < safeConfig.minGrade) errors.push(`Média ${mediaGeral.toFixed(1)} < ${safeConfig.minGrade}`);
    if (infrequentPerc > safeConfig.maxInfrequentPercent) errors.push(`Infreq ${infrequentPerc.toFixed(0)}% > ${safeConfig.maxInfrequentPercent}%`);

    return {
      isEligible: errors.length === 0,
      mediaGeral,
      infrequentPerc,
      errors
    };
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
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = (inscricoes || []).filter((ins: any) => {
    const matchesStatus = filterStatus === 'ALL' || ins.status === filterStatus;
    const teamName = ins.teamName || ins.nome || "";
    const modalityName = ins.modality?.nome || "";
    
    const matchesSearch = teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          modalityName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão dos Jogos</h1>
            <p className="text-slate-500 font-medium">{inscricoes.length} equipes inscritas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-64 text-slate-900 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ins: any) => (
          <div key={ins.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
            
            {/* Equipe Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{ins.modality?.nome || 'N/A'}</div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">"{ins.nome || ins.teamName}"</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                  <Mail className="w-3.5 h-3.5" /> {ins.contactEmail || 'Sem contato'}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                ins.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                ins.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {ins.status === 'PENDING' || ins.status === 'Pendente' ? 'Pendente' : ins.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
              </div>
            </div>

            {/* Atletas List */}
            <div className="p-5 flex-1 space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase mb-3">Escalação e Auditoria</div>
              {(ins.members || []).map((m: any) => {
                const el = calculateEligibility(m);
                return (
                  <div key={m.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${el.isEligible ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-700">{m.student?.nome || 'Estudante não encontrado'} {m.isLeader && <span className="text-[10px] text-indigo-500 ml-1">★</span>}</div>
                        <div className="text-[10px] text-slate-400">{m.student?.turma?.nome || 'Turma N/A'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] px-1.5 py-0.5 rounded ${el.mediaGeral < safeConfig.minGrade ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                         Média: {el.mediaGeral.toFixed(1)}
                       </span>
                       <span className={`text-[9px] px-1.5 py-0.5 rounded ${el.infrequentPerc > safeConfig.maxInfrequentPercent ? 'bg-red-50 text-red-600 font-bold' : 'bg-slate-50 text-slate-500'}`}>
                         Infreq: {el.infrequentPerc.toFixed(0)}%
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Actions */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex gap-2">
              <button 
                disabled={updating === ins.id}
                onClick={() => updateStatus(ins.id, 'APPROVED', '')}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-100"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
              </button>
              <button 
                disabled={updating === ins.id}
                onClick={() => {
                  const reason = prompt('Motivo da rejeição:');
                  if (reason) updateStatus(ins.id, 'REJECTED', reason);
                }}
                className="flex-1 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500">Nenhuma inscrição encontrada para os critérios selecionados.</p>
        </div>
      )}
    </div>
  );
}
