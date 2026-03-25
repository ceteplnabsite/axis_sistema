
'use client';

import React, { useState } from 'react';
import { 
  Trophy, Settings, Save, AlertCircle, 
  CheckCircle2, Loader2, Info, ArrowLeft,
  XCircle, ToggleLeft, ToggleRight, Plus, Users, Trash2, Edit2
} from 'lucide-react';
import Link from 'next/link';

export default function JogosConfigClient({ initialSettings, initialModalities }: { initialSettings: any, initialModalities: any }) {
  const [settings, setSettings] = useState(initialSettings || {
    termsContent: '',
    minGrade: 6,
    minAttendance: 75,
    maxInfrequentPercent: 20,
    isOpen: true
  });
  const [modalities, setModalities] = useState(initialModalities || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para nova modalidade
  const [newModality, setNewModality] = useState({ nome: '', minPlayers: 1, maxPlayers: 5, isMisto: false });
  const [addingModality, setAddingModality] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/jogos/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações gerais salvas!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddModality = async () => {
    setAddingModality(true);
    try {
      const res = await fetch('/api/jogos/modalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModality)
      });
      if (res.ok) {
        const mod = await res.json();
        setModalities([...modalities, mod]);
        setNewModality({ nome: '', minPlayers: 1, maxPlayers: 5, isMisto: false });
        setMessage({ type: 'success', text: 'Modalidade criada com sucesso!' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao criar modalidade.' });
    } finally {
      setAddingModality(false);
    }
  };

  const toggleModalityStatus = async (mod: any) => {
    try {
      const res = await fetch('/api/jogos/modalidades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mod.id, isActive: !mod.isActive })
      });
      if (res.ok) {
        setModalities(modalities.map((m: any) => m.id === mod.id ? { ...m, isActive: !m.isActive } : m));
      }
    } catch (e) { console.error(e); }
  };

  const toggleModalityMisto = async (mod: any) => {
    try {
      const res = await fetch('/api/jogos/modalidades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mod.id, isMisto: !mod.isMisto })
      });
      if (res.ok) {
        setModalities(modalities.map((m: any) => m.id === mod.id ? { ...m, isMisto: !m.isMisto } : m));
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteModality = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta modalidade? (Isso falhará se houver times inscritos nela)')) return;
    try {
      const res = await fetch(`/api/jogos/modalidades?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModalities(modalities.filter((m: any) => m.id !== id));
        setMessage({ type: 'success', text: 'Modalidade excluída!' });
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jogos" className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Painel de Customização</h1>
            <p className="text-slate-500 font-medium">Configure regras, regulamento e modalidades</p>
          </div>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Tudo
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-bold">{message.text}</span>
        </div>
      )}

      {/* Tabs / Subsections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Regulamento */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest">
            <Info className="w-4 h-4 text-indigo-500" />
            Regulamento Público (Formulário)
          </label>
          <textarea 
            value={settings.termsContent}
            onChange={(e) => setSettings({ ...settings, termsContent: e.target.value })}
            className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 leading-relaxed font-medium transition-all"
            placeholder="Texto do regulamento..."
          />
        </div>

        {/* Gerenciar Modalidades */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-indigo-500" />
              Gestão de Modalidades
            </label>
            <span className="text-xs font-bold text-slate-400">{modalities.length} cadastradas</span>
          </div>

          {/* New Modality Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
            <div className="sm:col-span-2">
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Nome da Modalidade</span>
              <input 
                type="text" placeholder="Ex: Futsal Masc."
                value={newModality.nome}
                onChange={(e) => setNewModality({ ...newModality, nome: e.target.value })}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
              />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Mín/Máx Jog.</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={newModality.minPlayers}
                  onChange={(e) => setNewModality({ ...newModality, minPlayers: parseInt(e.target.value) })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
                />
                <input 
                  type="number"
                  value={newModality.maxPlayers}
                  onChange={(e) => setNewModality({ ...newModality, maxPlayers: parseInt(e.target.value) })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
                />
              </div>
            </div>
            
            <div className="sm:col-span-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
              <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 w-full sm:w-auto">
                <input 
                  type="checkbox"
                  checked={newModality.isMisto}
                  onChange={(e) => setNewModality({ ...newModality, isMisto: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-700">Equipe Mista (Regra de Diversidade)</span>
              </label>

              <button 
                onClick={handleAddModality}
                disabled={addingModality || !newModality.nome}
                className="w-full sm:w-1/3 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
              >
                {addingModality ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Adicionar
              </button>
            </div>
          </div>

          {/* List or Table of Modalities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modalities.map((mod: any) => (
              <div key={mod.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                mod.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${mod.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      {mod.nome}
                      {mod.isMisto && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase font-black uppercase tracking-wider">Misto</span>}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Equipe: {mod.minPlayers} a {mod.maxPlayers} membros
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => toggleModalityMisto(mod)}
                    className={`p-2 rounded-lg transition-colors text-xs font-bold uppercase ${mod.isMisto ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    title={mod.isMisto ? 'Desativar Regra Mista' : 'Ativar Regra Mista'}
                  >
                    Misto
                  </button>
                  <button 
                    onClick={() => toggleModalityStatus(mod)}
                    className={`p-2 rounded-lg transition-colors ${mod.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-200'}`}
                    title={mod.isActive ? 'Modalidade Ativa' : 'Modalidade Oculta'}
                  >
                    {mod.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => handleDeleteModality(mod.id)}
                    className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critérios Automáticos */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
           <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest">
              <Users className="w-4 h-4 text-indigo-500" />
              Auditoria de Membros
           </label>
           <div className="space-y-4">
             <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Média Mínima Geral</span>
              <input type="number" step="0.5" value={settings.minGrade} onChange={(e) => setSettings({ ...settings, minGrade: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none border-b-2 border-b-transparent focus:border-b-indigo-500 transition-all" />
             </div>
             <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Infrequência Máxima (%)</span>
              <input type="number" value={settings.maxInfrequentPercent} onChange={(e) => setSettings({ ...settings, maxInfrequentPercent: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none border-b-2 border-b-transparent focus:border-b-indigo-500 transition-all" />
             </div>
           </div>
        </div>

        {/* Status das Inscrições */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center space-y-4 text-center">
            <div className={`p-4 rounded-full ${settings.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <Settings className={`w-12 h-12 ${settings.isOpen ? 'animate-spin-slow' : ''}`} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">Inscrições estão {settings.isOpen ? 'Abertas' : 'Fechadas'}</h3>
            <button 
              onClick={() => setSettings({ ...settings, isOpen: !settings.isOpen })}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                settings.isOpen ? 'bg-white border-red-500 text-red-600 hover:bg-red-50' : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {settings.isOpen ? 'Encerrar Período' : 'Iniciar Período'}
            </button>
        </div>

      </div>
    </div>
  );
}
