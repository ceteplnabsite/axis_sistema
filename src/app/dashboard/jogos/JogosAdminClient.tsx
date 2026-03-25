
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
      {/* Lista de Equipes em Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Líder</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modalidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data Inscrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((ins: any) => {
                const totalDocs = (ins.members || []).reduce((acc: number, m: any) => acc + (m.idFrontUrl ? 1 : 0) + (m.idBackUrl ? 1 : 0), 0);
                const requiredDocs = (ins.members || []).length * 2;
                const isDocsComplete = totalDocs === requiredDocs && requiredDocs > 0;
                const dateAt = new Date(ins.createdAt).toLocaleDateString('pt-BR');

                return (
                  <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 leading-tight">"{ins.nome || ins.teamName}"</span>
                        <span className="text-[10px] text-slate-400 font-medium">{ins.contactEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-sm font-bold text-slate-600 truncate max-w-[150px]">{ins.modality?.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 ${
                          isDocsComplete ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <ImageIcon size={12} /> {totalDocs}/{requiredDocs}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-medium text-slate-500">{dateAt}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                          ins.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          ins.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {ins.status === 'PENDING' || ins.status === 'Pendente' ? 'Pendente' : ins.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/dashboard/jogos/${ins.id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <Settings size={14} /> Gerenciar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium">Nenhuma equipe encontrada para os critérios de busca.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal (Reaproveitado para se necessário) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           {/* ... modal logic similar to before if we want to keep it here, but ideally now moved to team page ... */}
           <div className="bg-white p-10 rounded-3xl">Limpando... <button onClick={() => setViewingDoc(null)}>Fechar</button></div>
        </div>
      )}
    </div>
  );
}
