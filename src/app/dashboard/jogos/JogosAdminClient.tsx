
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, CheckCircle2, XCircle, 
  Search, Mail, ChevronDown, ChevronUp, 
  Settings, ExternalLink, ShieldCheck, AlertCircle,
  Eye, Image as ImageIcon, X, Trash2, Filter, Layers, Download
} from 'lucide-react';
import Link from 'next/link';

export default function JogosAdminClient({ initialInscricoes, modalities, config }: any) {
  const [inscricoes, setInscricoes] = useState(initialInscricoes || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  const safeConfig = config || { minGrade: 6, minAttendance: 75, maxInfrequentPercent: 20 };

  const calculateEligibility = (member: any) => {
    const student = member?.student;
    if (!student) return { isEligible: false, mediaGeral: 0, passingPerc: 0, infrequentPerc: 0, errors: ["Dados ausentes"] };

    const notas = student.notas || [];
    const totalSubjects = notas.length;
    const passingSubjects = notas.filter((n: any) => (n.nota || 0) >= safeConfig.minGrade).length;
    const passingPerc = totalSubjects > 0 ? (passingSubjects / totalSubjects) * 100 : 0;
    
    const infrequentCount = notas.filter((n: any) => n.isDesistenteUnid1 || n.isDesistenteUnid2 || n.isDesistenteUnid3).length;
    const infrequentPerc = totalSubjects > 0 ? (infrequentCount / totalSubjects) * 100 : 0;

    const errors = [];
    if (passingPerc < 75) errors.push(`Aprovado em ${passingPerc.toFixed(0)}% das disc. (Mínimo 75%)`);
    if (infrequentPerc > safeConfig.maxInfrequentPercent) errors.push(`Infreq ${infrequentPerc.toFixed(0)}% > ${safeConfig.maxInfrequentPercent}%`);

    return { isEligible: errors.length === 0, mediaGeral: passingPerc, passingPerc, infrequentPerc, errors };
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Tem certeza que deseja EXCLUIR permanentemente esta equipe e todos os seus vínculos?")) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/jogos/admin/team?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInscricoes(inscricoes.filter((ins: any) => ins.id !== id));
      }
    } catch (e) { console.error(e); } finally { setUpdating(null); }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) return;
    // CSV Header
    const headers = ["ID", "Equipe", "Modalidade", "Status", "Lider", "Telefone", "Membros"];
    const rows = filtered.map((ins: any) => [
      ins.id,
      `"${ins.nome || ins.teamName}"`,
      ins.modality?.nome,
      ins.status,
      `"${(ins.members || []).find((m: any) => m.isLeader)?.student?.nome || "N/A"}"`,
      ins.contactPhone || "",
      (ins.members || []).length
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `equipes_${selectedModality}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = (inscricoes || []).filter((ins: any) => {
    const teamName = (ins.nome || ins.teamName || "").toLowerCase();
    const modalityName = (ins.modality?.nome || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = teamName.includes(search) || modalityName.includes(search);
    const matchesModality = selectedModality === 'all' || ins.modalityId === selectedModality;
    
    return matchesSearch && matchesModality;
  });

  const statsByModality = modalities.map((mod: any) => ({
    ...mod,
    count: inscricoes.filter((ins: any) => ins.modalityId === mod.id).length,
    approved: inscricoes.filter((ins: any) => ins.modalityId === mod.id && ins.status === 'APPROVED').length
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
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
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Filter className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            <select 
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="w-full pl-10 pr-8 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-bold text-xs appearance-none cursor-pointer"
            >
              <option value="all">Todas as Modalidades</option>
              {modalities.map((m: any) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={exportToCSV}
            className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 font-bold text-xs shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Chave</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Filtro rápido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-48 text-slate-900 transition-all"
            />
          </div>

          <Link 
            href="/dashboard/jogos/partidas"
            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 font-bold text-xs"
            title="Sorteio e Resultados das Partidas"
          >
            <Trophy className="w-5 h-5" />
            <span className="hidden sm:inline">Chaves / Jogos</span>
          </Link>

          <Link 
            href="/dashboard/jogos/config"
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 font-bold text-xs"
            title="Customizar Formulário e Regras"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statsByModality.map((stat: any) => (
          <button 
            key={stat.id}
            onClick={() => setSelectedModality(stat.id === selectedModality ? 'all' : stat.id)}
            className={`p-4 rounded-3xl border transition-all text-left space-y-2 ${
              selectedModality === stat.id 
                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className={`p-2 w-fit rounded-lg ${selectedModality === stat.id ? 'bg-indigo-500' : 'bg-slate-100'}`}>
              <Layers className={`w-4 h-4 ${selectedModality === stat.id ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${selectedModality === stat.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                {stat.nome}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black ${selectedModality === stat.id ? 'text-white' : 'text-slate-900'}`}>{stat.count}</span>
                <span className={`text-[10px] font-bold ${selectedModality === stat.id ? 'text-indigo-200' : 'text-slate-400'}`}>equipes</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe / Líder</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Esporte</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((ins: any) => {
                const totalDocs = (ins.members || []).reduce((acc: number, m: any) => acc + (m.idFrontUrl ? 1 : 0) + (m.idBackUrl ? 1 : 0), 0);
                const requiredDocs = (ins.members || []).length * 2;
                const isDocsComplete = totalDocs === requiredDocs && requiredDocs > 0;

                return (
                  <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 leading-tight">
                      "{ins.nome || ins.teamName}"
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{ins.modality?.nome}</span>
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
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                          ins.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          ins.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {ins.status === 'APPROVED' ? 'Aprovado' : ins.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/dashboard/jogos/${ins.id}`}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          <Settings size={14} /> Gerenciar
                        </Link>
                        <button 
                          onClick={() => deleteTeam(ins.id)}
                          disabled={updating === ins.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
