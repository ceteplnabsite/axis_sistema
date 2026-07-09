
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, Calendar, Clock, 
  ChevronRight, Save, Download, RefreshCcw, 
  Trash2, Plus, Info, CheckCircle2, XCircle
} from 'lucide-react';

export default function MatchesClient({ modalities, teams, initialMatches }: any) {
  const [selectedModality, setSelectedModality] = useState(modalities[0]?.id || '');
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);

  const filteredMatches = matches.filter((m: any) => m.modalityId === selectedModality);
  const modalityTeams = teams.filter((t: any) => t.modalityId === selectedModality);

  const generateBracket = async () => {
    if (!confirm(`Deseja gerar uma nova chave para ${modalities.find((m: any) => m.id === selectedModality)?.nome}? Isso pode apagar partidas existentes desta modalidade.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/jogos/admin/matches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modalityId: selectedModality })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Update matches: remove old ones of this modality, add new ones
      setMatches([
        ...matches.filter((m: any) => m.modalityId !== selectedModality),
        ...data.matches
      ]);
      alert("Chave gerada com sucesso!");
    } catch (e: any) {
      alert(e.message || "Erro ao gerar chave");
    } finally {
      setLoading(false);
    }
  };

  const updateMatch = async (matchId: string, score1: number, score2: number, status: string) => {
    try {
      const res = await fetch('/api/jogos/admin/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, score1, score2, status })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.generatedNextRound) {
          // Recarrega a página inteira para puxar a nova chave (rodada) que foi criada
          window.location.reload();
        } else {
          setMatches(matches.map((m: any) => m.id === matchId ? { ...m, score1, score2, status } : m));
        }
      }
    } catch (e) { alert("Erro ao salvar resultado"); }
  };

  const exportCSV = () => {
    if (filteredMatches.length === 0) return;
    const headers = ["Rodada", "Mandante", "Gols/Pontos", "X", "Gols/Pontos", "Visitante", "Status"];
    const rows = filteredMatches.map((m: any) => [
      `Rodada ${m.round}`,
      m.team1?.nome || "A definir",
      m.score1,
      "vs",
      m.score2,
      m.team2?.nome || "A definir",
      m.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tabela_jogos_${selectedModality}.csv`;
    link.click();
  };

  const rounds = Array.from(new Set(filteredMatches.map((m: any) => m.round))).sort((a: any, b: any) => a - b);

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciador de Partidas</h1>
            <p className="text-slate-500 font-medium">{modalityTeams.length} times aprovados na modalidade</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedModality}
            onChange={(e) => setSelectedModality(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-bold text-xs"
          >
            {modalities.map((m: any) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <button 
            onClick={generateBracket}
            disabled={loading}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-wider shadow-md"
          >
             <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             Sortear Chave
          </button>

          <button 
            onClick={exportCSV}
            className="p-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-all font-bold text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Brackets / Rounds View */}
      {filteredMatches.length === 0 && (
        <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400">
             <Trophy size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-600">Nenhuma partida gerada ainda</h3>
          <p className="text-slate-400 max-w-sm mx-auto">Selecione uma modalidade e clique em "Sortear Chave" para organizar os times em partidas automaticamente.</p>
        </div>
      )}

      <div className="w-full overflow-x-auto pb-12 pt-8">
        <div className="flex gap-16 min-w-max">
          {rounds.map((round: any) => (
            <div key={round} className="flex flex-col justify-around gap-8 min-w-[280px] relative">
              <div className="flex items-center gap-3 absolute -top-8 left-0 right-0">
                 <div className="h-px flex-1 bg-indigo-100" />
                 <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Rodada {round}</h2>
                 <div className="h-px flex-1 bg-indigo-100" />
              </div>

              {filteredMatches.filter((m: any) => m.round === round).map((match: any) => (
                <div key={match.id} className="relative flex items-center group">
                   {/* Linha horizontal para a direita (conecta ao próximo) */}
                   {round < rounds.length && (
                     <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-slate-200 group-hover:bg-indigo-300 transition-colors" />
                   )}
                   {/* Linha horizontal para a esquerda (conecta ao anterior) */}
                   {round > 1 && (
                     <div className="absolute top-1/2 -left-8 w-8 h-[2px] bg-slate-200 group-hover:bg-indigo-300 transition-colors" />
                   )}
                   
                   <div className="w-full z-10">
                      <MatchCard match={match} onUpdate={updateMatch} />
                   </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, onUpdate }: any) {
  const [s1, setS1] = useState(match.score1 || 0);
  const [s2, setS2] = useState(match.score2 || 0);

  const save = () => {
    onUpdate(match.id, s1, s2, 'COMPLETED');
  };

  const t1Winner = match.status === 'COMPLETED' && match.winnerId === match.team1Id;
  const t2Winner = match.status === 'COMPLETED' && match.winnerId === match.team2Id;

  return (
    <div className={`w-full bg-white rounded-2xl border-2 ${match.status === 'COMPLETED' ? 'border-slate-200' : 'border-indigo-100'} shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
       <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
             <Clock size={10} />
             {match.status === 'COMPLETED' ? 'Finalizada' : 'Pendente'}
          </div>
          {match.status !== 'COMPLETED' && (
             <button 
               onClick={save} 
               className="text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
             >
               Salvar
             </button>
          )}
       </div>

       {/* Equipe 1 */}
       <div className={`flex items-center justify-between p-3 border-b border-slate-100 transition-colors ${t1Winner ? 'bg-emerald-50/50' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden pr-2">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t1Winner ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
               {t1Winner ? <Trophy size={12} /> : <Users size={12} />}
             </div>
             <span className={`text-sm font-bold truncate ${t1Winner ? 'text-emerald-900' : 'text-slate-700'}`}>
               {match.team1?.nome || <span className="text-slate-300 font-medium italic">A definir...</span>}
             </span>
          </div>
          <input 
            type="number"
            value={s1}
            onChange={(e) => setS1(parseInt(e.target.value) || 0)}
            className={`w-12 h-10 text-center rounded-xl text-base font-black outline-none transition-all ${
              t1Winner 
                ? 'bg-emerald-100 border-none text-emerald-800' 
                : 'bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-700'
            }`}
          />
       </div>

       {/* Equipe 2 */}
       <div className={`flex items-center justify-between p-3 transition-colors ${t2Winner ? 'bg-emerald-50/50' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden pr-2">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t2Winner ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
               {t2Winner ? <Trophy size={12} /> : <Users size={12} />}
             </div>
             <span className={`text-sm font-bold truncate ${t2Winner ? 'text-emerald-900' : 'text-slate-700'}`}>
               {match.team2?.nome || <span className="text-slate-300 font-medium italic">A definir...</span>}
             </span>
          </div>
          <input 
            type="number"
            value={s2}
            onChange={(e) => setS2(parseInt(e.target.value) || 0)}
            className={`w-12 h-10 text-center rounded-xl text-base font-black outline-none transition-all ${
              t2Winner 
                ? 'bg-emerald-100 border-none text-emerald-800' 
                : 'bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-700'
            }`}
          />
       </div>
    </div>
  );
}
