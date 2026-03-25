
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
        setMatches(matches.map((m: any) => m.id === matchId ? { ...m, score1, score2, status } : m));
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {rounds.map((round: any) => (
          <div key={round} className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="h-px flex-1 bg-slate-100" />
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Rodada {round}</h2>
               <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="space-y-4">
              {filteredMatches.filter((m: any) => m.round === round).map((match: any) => (
                <MatchCard key={match.id} match={match} onUpdate={updateMatch} />
              ))}
            </div>
          </div>
        ))}
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Teams Layout */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
               <Users size={20} />
            </div>
            <span className="text-[11px] font-black text-slate-800 text-center line-clamp-2 h-8 leading-tight">{match.team1?.nome || "TBD"}</span>
            <input 
              type="number" 
              value={s1} 
              onChange={(e) => setS1(parseInt(e.target.value) || 0)}
              className="w-16 p-2 bg-slate-50 border border-slate-100 rounded-xl text-center text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
             <span className="text-[9px] font-black text-slate-300 uppercase">VS</span>
             <button 
               onClick={save}
               className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
             >
                <Save size={18} />
             </button>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
               <Users size={20} />
            </div>
            <span className="text-[11px] font-black text-slate-800 text-center line-clamp-2 h-8 leading-tight">{match.team2?.nome || "TBD"}</span>
            <input 
              type="number" 
              value={s2} 
              onChange={(e) => setS2(parseInt(e.target.value) || 0)}
              className="w-16 p-2 bg-slate-50 border border-slate-100 rounded-xl text-center text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className={`px-5 py-2 text-center text-[9px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 ${
        match.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
      }`}>
        <Clock size={10} /> {match.status === 'COMPLETED' ? 'Finalizada' : 'Pendente'}
      </div>
    </div>
  );
}
