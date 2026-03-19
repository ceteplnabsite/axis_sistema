
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Settings, Save, AlertCircle, 
  CheckCircle2, Loader2, Info, ArrowLeft,
  XCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import Link from 'next/link';

export default function JogosConfigClient({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings || {
    termsContent: '',
    minGrade: 6,
    minAttendance: 75,
    maxInfrequentPercent: 20,
    isOpen: true
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/jogos/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jogos" className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customizar Inscrições</h1>
            <p className="text-slate-500 font-medium">Configure as regras e o regulamento dos jogos</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Alterações
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Regulamento Texto */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest mb-4">
              <Info className="w-4 h-4 text-indigo-500" />
              Regulamento do Formulário (Termos de Aceite)
            </label>
            <textarea 
              value={settings.termsContent}
              onChange={(e) => setSettings({ ...settings, termsContent: e.target.value })}
              className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 leading-relaxed font-medium transition-all"
              placeholder="Escreva aqui o texto que o aluno deve aceitar antes de se inscrever..."
            />
          </div>
        </div>

        {/* Regras Automáticas */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
           <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest mb-2">
              <Trophy className="w-4 h-4 text-indigo-500" />
              Critérios de Participação
           </label>
           
           <div className="space-y-4">
             <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Média Mínima Geral</span>
              <input 
                type="number" step="0.5"
                value={settings.minGrade}
                onChange={(e) => setSettings({ ...settings, minGrade: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
              />
             </div>
             <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Frequência Mínima (%)</span>
              <input 
                type="number"
                value={settings.minAttendance}
                onChange={(e) => setSettings({ ...settings, minAttendance: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
              />
             </div>
             <div>
              <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">Limite Máx. Infrequência (%)</span>
              <input 
                type="number"
                value={settings.maxInfrequentPercent}
                onChange={(e) => setSettings({ ...settings, maxInfrequentPercent: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-bold"
              />
              <p className="mt-2 text-[10px] text-slate-400 italic">O sistema calcula a infrequência baseado nos registros do lançamento de notas.</p>
             </div>
           </div>
        </div>

        {/* Status Inscrições */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 flex flex-col justify-center">
            <div className="text-center space-y-4">
              <div className={`inline-flex p-4 rounded-full ${settings.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {settings.isOpen ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900">As inscrições estão {settings.isOpen ? 'Abertas' : 'Fechadas'}</h3>
              <p className="text-slate-500 text-sm font-medium">Ao fechar as inscrições, o formulário público em <b>/jogos</b> ficará inacessível.</p>
              
              <button 
                onClick={() => setSettings({ ...settings, isOpen: !settings.isOpen })}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-4 border-2 ${
                  settings.isOpen 
                    ? 'bg-white border-red-500 text-red-600 hover:bg-red-50' 
                    : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {settings.isOpen ? 'Fechar Inscrições Agora' : 'Abrir Inscrições Agora'}
              </button>
            </div>
        </div>

      </div>
    </div>
  );
}
