'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Trophy, Users, AlertCircle } from 'lucide-react';

export default function ScheduleClient({ initialMatches }: any) {
  const [matches, setMatches] = useState(initialMatches);
  const [saving, setSaving] = useState(false);

  const days = [1, 2, 3]; // Dia 1, Dia 2, Dia 3

  const getDayMatches = (day: number) => matches.filter((m: any) => m.matchDay === day);
  const getUnscheduledMatches = () => matches.filter((m: any) => !m.matchDay);

  const setMatchDay = async (matchId: string, matchDay: number | null) => {
    const previousMatches = [...matches];
    setMatches(matches.map((m: any) => m.id === matchId ? { ...m, matchDay } : m));
    
    setSaving(true);
    try {
      const res = await fetch('/api/jogos/admin/matches/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, matchDay })
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    } catch (e) {
      alert("Erro ao salvar horário.");
      setMatches(previousMatches); // revert
    } finally {
      setSaving(false);
    }
  };

  const setMatchTime = async (matchId: string, matchDateStr: string) => {
    const previousMatches = [...matches];
    setMatches(matches.map((m: any) => m.id === matchId ? { ...m, matchDate: new Date(matchDateStr).toISOString() } : m));
    
    setSaving(true);
    try {
      const res = await fetch('/api/jogos/admin/matches/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, matchDate: new Date(matchDateStr).toISOString() })
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    } catch (e) {
      alert("Erro ao salvar horário.");
      setMatches(previousMatches);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('matchId', matchId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, day: number | null) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData('matchId');
    if (matchId) {
      setMatchDay(matchId, day);
    }
  };

  return (
    <div className="space-y-8 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda de Jogos</h1>
            <p className="text-slate-500 font-medium">Arraste as partidas para os dias de competição</p>
          </div>
        </div>
        {saving && (
           <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" /> Salvando...
           </div>
        )}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 flex-1 items-start">
        
        <div 
          className="flex-1 min-w-[320px] bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col max-h-full"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
           <div className="p-5 border-b border-slate-200/50 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-600 uppercase tracking-wider text-sm flex items-center gap-2">
                 <AlertCircle size={16} /> A Definir
              </h3>
              <span className="bg-slate-200 text-slate-600 font-bold px-3 py-1 rounded-full text-xs">
                 {getUnscheduledMatches().length}
              </span>
           </div>
           <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {getUnscheduledMatches().map((m: any) => (
                <MatchCard key={m.id} match={m} onDragStart={handleDragStart} onSetTime={setMatchTime} />
              ))}
              {getUnscheduledMatches().length === 0 && (
                <div className="text-center p-8 text-slate-400 font-medium text-sm">
                   Nenhuma partida pendente.
                </div>
              )}
           </div>
        </div>

        {days.map(day => (
          <div 
            key={day}
            className="flex-1 min-w-[320px] bg-slate-50 rounded-3xl border border-slate-200 flex flex-col max-h-full shadow-sm"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day)}
          >
             <div className="p-5 border-b border-slate-200 bg-white rounded-t-3xl flex justify-between items-center shrink-0">
                <h3 className="font-black text-indigo-700 uppercase tracking-wider text-sm">Dia {day}</h3>
                <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">
                   {getDayMatches(day).length}
                </span>
             </div>
             <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {getDayMatches(day).map((m: any) => (
                  <MatchCard key={m.id} match={m} onDragStart={handleDragStart} onSetTime={setMatchTime} />
                ))}
                {getDayMatches(day).length === 0 && (
                  <div className="text-center p-8 text-slate-400 font-medium text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                     Arraste partidas para cá.
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, onDragStart, onSetTime }: any) {
  
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, match.id)}
      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group"
    >
       <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
             {match.modality?.nome}
          </span>
          {match.round === 0 ? (
             <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {match.groupId || "Fase de Grupos"}
             </span>
          ) : (
             <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                Mata-mata
             </span>
          )}
       </div>

       <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
             <Users size={14} className="text-slate-400 shrink-0" />
             <span className={`text-sm font-bold truncate ${!match.team1Id ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                {match.team1?.nome || "A definir"}
             </span>
          </div>
          <div className="flex items-center gap-2">
             <Users size={14} className="text-slate-400 shrink-0" />
             <span className={`text-sm font-bold truncate ${!match.team2Id ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                {match.team2?.nome || "A definir"}
             </span>
          </div>
       </div>

       {match.matchDay && (
         <div className="pt-3 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
               <Clock size={12} /> Horário Exato
            </label>
            <input 
              type="datetime-local" 
              value={formatDateForInput(match.matchDate)}
              onChange={(e) => onSetTime(match.id, e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
            />
         </div>
       )}
    </div>
  );
}
