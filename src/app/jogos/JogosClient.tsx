
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, User, Mail, Calendar, 
  ArrowRight, ArrowLeft, CheckCircle2, 
  Search, X, Plus, Info, AlertCircle,
  Loader2, Check, XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SportModality {
  id: string;
  nome: string;
  minPlayers: number;
  maxPlayers: number;
}

interface SportsSettings {
  termsContent: string;
  isOpen: boolean;
  minGrade: number;
  minAttendance: number;
}

interface TeamMember {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  isLeader: boolean;
  dataNascimento?: string;
}

export default function JogosClient({ 
  initialConfig, 
  modalities, 
  turmas 
}: { 
  initialConfig: SportsSettings;
  modalities: SportModality[];
  turmas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // States
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedModality, setSelectedModality] = useState<SportModality | null>(null);
  const [leaderMatricula, setLeaderMatricula] = useState('');
  const [leaderData, setLeaderData] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Verificação de Inscrições Abertas
  if (!initialConfig.isOpen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Inscrições Encerradas</h2>
            <p className="text-slate-500 font-medium">O período de inscrições para os Jogos Escolares foi finalizado ou está temporariamente suspenso.</p>
          </div>
          <button onClick={() => router.push('/')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setStep(1);
    setSelectedModality(null);
    setLeaderMatricula('');
    setLeaderData(null);
    setEmail('');
    setTeamName('');
    setMembers([]);
    setAcceptedTerms(false);
  };

  useEffect(() => {
    if (leaderMatricula.length >= 4) {
      const timer = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/jogos/estudantes?matricula=${leaderMatricula}`);
          const data = await res.json();
          if (data.estudante) {
            setLeaderData({
              id: data.estudante.matricula,
              nome: data.estudante.nome,
              matricula: data.estudante.matricula,
              turma: data.estudante.turma.nome,
              isLeader: true
            });
          } else {
            setLeaderData(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [leaderMatricula]);

  const handleSearch = async () => {
    if (!searchQuery && !selectedTurma) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/jogos/estudantes?query=${searchQuery}&turmaId=${selectedTurma}`);
      const data = await res.json();
      const list = data.estudantes || [];
      setSearchResults(list.map((s: any) => ({
        id: s.matricula,
        nome: s.nome,
        matricula: s.matricula,
        turma: s.turma.nome,
        isLeader: false
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = (student: TeamMember) => {
    if (!student.id && !student.matricula) return;

    const isAlreadyIn = members.some(m => 
      (m.id && student.id && m.id === student.id) || 
      (m.matricula && student.matricula && m.matricula === student.matricula)
    );
    
    const isLeader = leaderData && (
      (leaderData.id && student.id && leaderData.id === student.id) || 
      (leaderData.matricula && student.matricula && leaderData.matricula === student.matricula)
    );
    
    if (isAlreadyIn || isLeader) return;
    if (selectedModality && members.length + 1 >= selectedModality.maxPlayers) return;
    setMembers([...members, student]);
  };

  const removeMember = (id: string, matricula?: string) => {
    setMembers(prev => prev.filter(m => {
      const matchId = id && m.id === id;
      const matchMatricula = matricula && m.matricula === matricula;
      return !(matchId || matchMatricula);
    }));
  };

  const updateBirthDate = (id: string, date: string, matricula?: string) => {
    if (!id && !matricula) return;

    if (leaderData && (
      (id && leaderData.id === id) || 
      (matricula && leaderData.matricula === matricula)
    )) {
      setLeaderData({ ...leaderData, dataNascimento: date });
    } else {
      setMembers(prev => prev.map(m => 
        ((id && m.id === id) || (matricula && m.matricula === matricula)) 
          ? { ...m, dataNascimento: date } 
          : m
      ));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/jogos/inscrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modalityId: selectedModality?.id,
          teamName,
          email,
          members: [
            { ...leaderData, isLeader: true },
            ...members.map(m => ({ ...m, isLeader: false }))
          ]
        })
      });

      if (res.ok) {
        setStep(5);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao realizar inscrição');
      }
    } catch (e) {
      alert('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Inscrições Jogos Escolares</h1>
          <p className="text-slate-500">Mantenha o espírito esportivo e boa sorte!</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          
          {/* Progress Bar */}
          {step < 5 && (
            <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === i ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 
                    step > i ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
                  </div>
                  {i < 4 && <div className={`w-12 h-1 mx-2 rounded ${step > i ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
          )}

          <div className="p-8">
            
            {/* Step 1: Termos */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-3">
                    <Info className="w-5 h-5" />
                    <span>Regulamento Geral</span>
                  </div>
                  <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {initialConfig.termsContent}
                  </div>
                </div>
                <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 text-sm font-medium">
                    Li e aceito todos os termos do regulamento para participar dos jogos.
                  </span>
                </label>
                <button 
                  disabled={!acceptedTerms}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 2: Modalidade e Líder */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Escolha a Modalidade</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modalities.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModality(m)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedModality?.id === m.id 
                            ? 'border-indigo-600 bg-indigo-50/50' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`font-bold ${selectedModality?.id === m.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {m.nome}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Equipe: {m.minPlayers} a {m.maxPlayers} jogadores
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sua Matrícula (Líder)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={leaderMatricula}
                      onChange={(e) => setLeaderMatricula(e.target.value)}
                      placeholder="Digite sua matrícula"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                    {loading && <Loader2 className="absolute right-4 top-4 w-6 h-6 animate-spin text-indigo-600" />}
                  </div>
                  {leaderData && (
                    <div className="mt-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
                      <div className="p-2 bg-emerald-500 rounded-full">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-900">{leaderData.nome}</div>
                        <div className="text-xs text-emerald-700">{leaderData.turma}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                    Voltar
                  </button>
                  <button 
                    disabled={!selectedModality || !leaderData}
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    Dados do Time <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Informações do Time */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-3 border border-indigo-100">
                  <Trophy className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-indigo-900">{selectedModality?.nome}</h3>
                    <p className="text-sm text-indigo-700">Líder: {leaderData?.nome}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Equipe</label>
                    <input 
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ex: Dragões de Fogo"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">E-mail de Contato do Líder</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 w-6 h-6 text-slate-400" />
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                    Voltar
                  </button>
                  <button 
                    disabled={!teamName || !email.includes('@')}
                    onClick={() => setStep(4)}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    Adicionar Jogadores <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Membros e Data de Nasc */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                
                {/* Search Panel */}
                <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    Adicionar Jogadores
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select 
                      value={selectedTurma}
                      onChange={(e) => setSelectedTurma(e.target.value)}
                      className="p-4 bg-white border border-slate-200 rounded-2xl outline-none text-slate-900 min-w-[150px]"
                    >
                      <option value="">Filtrar Turma</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nome ou Matrícula..."
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none pr-12 text-slate-900"
                      />
                      <button onClick={handleSearch} className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                        {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-4 shadow-xl max-h-80 overflow-y-auto z-50 relative animate-in slide-in-from-top-2">
                      {searchResults.map(s => {
                        const isAlreadyMember = members.some(m => 
                          (m.id && s.id && m.id === s.id) || 
                          (m.matricula && s.matricula && m.matricula === s.matricula)
                        );
                        const isTheLeader = leaderData && (
                          (leaderData.id && s.id && leaderData.id === s.id) || 
                          (leaderData.matricula && s.matricula && leaderData.matricula === s.matricula)
                        );
                        const isAdded = isAlreadyMember || isTheLeader;

                        return (
                          <div 
                            key={s.id || s.matricula} 
                            onClick={() => !isAdded && addMember(s)}
                            className={`flex items-center justify-between p-5 border-b border-slate-50 last:border-0 transition-all cursor-pointer ${
                              isAdded ? 'bg-slate-50 opacity-60' : 'hover:bg-indigo-50 active:bg-indigo-100'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-bold text-slate-800 text-sm">{s.nome}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{s.turma} • {s.matricula}</div>
                            </div>
                            <div className={`p-3 rounded-xl transition-all ${
                              isAdded ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white shadow-md'
                            }`}>
                              {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team List with Birth Dates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 px-2">Composição da Equipe</h3>
                    <div className="text-xs font-bold text-slate-500">
                      {members.length + 1} / {selectedModality?.maxPlayers || 0}
                    </div>
                  </div>
                  
                  {/* Leader with Date */}
                  <div className="p-5 bg-white border-2 border-indigo-100 rounded-3xl relative">
                    <div className="absolute top-4 right-5 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Líder</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="p-3 bg-indigo-600 rounded-2xl">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-lg leading-tight">{leaderData?.nome}</div>
                        <div className="text-sm text-slate-500">{leaderData?.turma}</div>
                      </div>
                      <div className="space-y-1 w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Nascimento</span>
                        <div className="relative w-full overflow-hidden">
                          <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                          <input 
                            type="date"
                            required
                            max="2012-12-31"
                            value={leaderData?.dataNascimento || ''}
                            onChange={(e) => updateBirthDate(leaderData!.id, e.target.value)}
                            className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 font-medium box-border max-w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members with Date */}
                  {members.map(m => (
                    <div key={m.id} className="p-5 bg-white border border-slate-200 rounded-3xl group animate-in slide-in-from-right-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-slate-200 transition-colors">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 text-lg leading-tight">{m.nome}</div>
                          <div className="text-sm text-slate-500">{m.turma}</div>
                        </div>
                       <div className="space-y-1 w-full">
                          <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Nascimento</span>
                           <div className="flex items-center gap-3 w-full">
                            <div className="relative flex-1 overflow-hidden">
                              <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input 
                              type="date"
                              required
                              max="2012-12-31"
                              value={m.dataNascimento || ''}
                              onChange={(e) => updateBirthDate(m.id, e.target.value, m.matricula)}
                              className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 font-medium box-border max-w-full"
                            />
                            </div>
                            <button onClick={() => removeMember(m.id, m.matricula)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                    Voltar
                  </button>
                  <button 
                    disabled={
                      (selectedModality ? members.length + 1 < selectedModality.minPlayers : true) || 
                      !leaderData?.dataNascimento ||
                      members.some(m => !m.dataNascimento) ||
                      submitting
                    }
                    onClick={handleSubmit}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100"
                  >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trophy className="w-6 h-6" />}
                    Finalizar Inscrição
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Sucesso */}
            {step === 5 && (
              <div className="text-center py-12 px-4 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Inscrição Enviada! 🎉</h2>
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 mb-10 max-w-sm mx-auto">
                  <p className="text-slate-600 leading-relaxed">
                    Time <span className="font-bold text-slate-900">"{teamName}"</span> inscrito em <span className="font-bold text-slate-900">{selectedModality?.nome}</span>.
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 justify-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> Em Processamento
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                  <button 
                    onClick={resetForm}
                    className="py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Nova Inscrição
                  </button>
                  <button 
                    onClick={() => router.push('/')}
                    className="py-4 px-6 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-slate-400 text-sm">
          SISTEMA DE GESTÃO ESPORTIVA • CETEP LNAB
        </p>
      </div>
    </div>
  );
}
