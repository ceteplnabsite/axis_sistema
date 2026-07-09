
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Users, Calendar, Clock, 
  ChevronRight, Save, Download, RefreshCcw, 
  Trash2, Plus, Info, CheckCircle2, XCircle, X
} from 'lucide-react';

export default function MatchesClient({ modalities, teams, initialMatches }: any) {
  const [selectedModality, setSelectedModality] = useState(modalities[0]?.id || '');
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [bracketSize, setBracketSize] = useState(16);
  const [format, setFormat] = useState('BRACKET'); // 'BRACKET' | 'GROUPS'
  const [activeTab, setActiveTab] = useState('BRACKET');

  const filteredMatches = matches.filter((m: any) => m.modalityId === selectedModality);
  const modalityTeams = teams.filter((t: any) => t.modalityId === selectedModality);

  const openWizard = () => {
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(2, modalityTeams.length))));
    setBracketSize(size);
    setShowWizard(true);
  };

  const confirmGenerate = async () => {
    setShowWizard(false);
    setLoading(true);
    try {
      const res = await fetch('/api/jogos/admin/matches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modalityId: selectedModality, bracketSize, format })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
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
  const hasGroups = rounds.includes(0);
  const bracketRounds = rounds.filter((r: any) => r > 0);
  const groupMatches = filteredMatches.filter((m: any) => m.round === 0);
  const groupsList = Array.from(new Set(groupMatches.map((m: any) => m.groupId))).filter(Boolean).sort();
  
  React.useEffect(() => {
    if (hasGroups) setActiveTab('GROUPS');
    else setActiveTab('BRACKET');
  }, [hasGroups, selectedModality]);

  const totalRounds = bracketRounds.length > 0 ? Math.max(...(bracketRounds as number[])) : 0;

  const getRoundName = (r: number) => {
     if (r === totalRounds) return "Final";
     if (r === totalRounds - 1) return "Semifinal";
     if (r === totalRounds - 2) return "Quartas de Final";
     if (r === totalRounds - 3) return "Oitavas de Final";
     if (r === totalRounds - 4) return "16-avos de Final";
     return `Rodada ${r}`;
  };

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
            onClick={openWizard}
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

      {hasGroups && (
        <div className="flex gap-4 border-b border-slate-200 mb-6">
           <button 
             onClick={() => setActiveTab('GROUPS')}
             className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'GROUPS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Fase de Grupos
           </button>
           <button 
             onClick={() => setActiveTab('BRACKET')}
             className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'BRACKET' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Mata-mata Final
           </button>
        </div>
      )}

      {/* GROUPS VIEW */}
      {hasGroups && activeTab === 'GROUPS' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12 pt-4">
            {groupsList.map((gName: any) => (
               <div key={gName as string} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h3 className="text-lg font-black text-slate-800">{gName}</h3>
                  <div className="space-y-3">
                     {groupMatches.filter((m: any) => m.groupId === gName).map((match: any) => (
                        <MatchCard key={match.id} match={match} onUpdate={updateMatch} />
                     ))}
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* BRACKET VIEW */}
      {(!hasGroups || activeTab === 'BRACKET') && bracketRounds.length > 0 && (
        <div className="w-full overflow-x-auto pb-12 pt-8">
          <div className="flex gap-16 min-w-max">
            {bracketRounds.map((round: any) => (
            <div key={round} className="flex flex-col justify-around gap-8 min-w-[280px] relative">
              <div className="flex items-center gap-3 absolute -top-8 left-0 right-0">
                 <div className="h-px flex-1 bg-indigo-100" />
                 <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] whitespace-nowrap">{getRoundName(round)}</h2>
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
      )}

      {/* Tournament Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">Assistente de Sorteio</h3>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{modalityTeams.length} times aprovados</p>
                  </div>
               </div>
               <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Formato da Competição</label>
                 <select 
                   value={format} 
                   onChange={e => setFormat(e.target.value)}
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                 >
                   <option value="BRACKET">Apenas Mata-mata (1 jogo e fora)</option>
                   <option value="GROUPS">Fase de Grupos (Mínimo 2 jogos) + Mata-mata</option>
                 </select>
               </div>

               <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {format === 'GROUPS' ? 'Tamanho da Chave Final (Quem avança)' : 'Tamanho da Chave (Equipes)'}
                 </label>
                 <select 
                   value={bracketSize} 
                   onChange={e => setBracketSize(parseInt(e.target.value))}
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                 >
                   <option value={2}>2 Times (Apenas Final)</option>
                   <option value={4}>4 Times (Semifinais)</option>
                   <option value={8}>8 Times (Quartas de Final)</option>
                   <option value={16}>16 Times (Oitavas de Final)</option>
                   <option value={32}>32 Times (16-avos de Final)</option>
                 </select>
                 
                 <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-800 font-medium leading-relaxed">
                   {format === 'GROUPS' ? (
                      <p>Os {modalityTeams.length} times serão divididos em grupos de 3 a 4 times. Os melhores colocados preencherão as <strong>{bracketSize} vagas</strong> da chave final.</p>
                   ) : bracketSize > modalityTeams.length ? (
                     <p>A chave terá <strong>{bracketSize} vagas</strong> para apenas {modalityTeams.length} times. Isso significa que <strong>{bracketSize - modalityTeams.length} times</strong> passarão direto para a próxima rodada por BYE.</p>
                   ) : bracketSize < modalityTeams.length ? (
                     <p className="text-red-600">A chave terá apenas <strong>{bracketSize} vagas</strong>, mas há {modalityTeams.length} times inscritos. <strong>{modalityTeams.length - bracketSize} times ficarão de fora</strong> do torneio!</p>
                   ) : (
                     <p>Chave perfeita! Todos os {modalityTeams.length} times têm adversários na primeira rodada.</p>
                   )}
                 </div>
               </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
               <button 
                 onClick={() => setShowWizard(false)}
                 className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all"
               >
                 Cancelar
               </button>
               <button 
                 onClick={confirmGenerate}
                 className="flex-1 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
               >
                 Confirmar Sorteio
               </button>
            </div>
          </div>
        </div>
      )}
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
