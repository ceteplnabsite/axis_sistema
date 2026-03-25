'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle2, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function DocumentosClient({ team }: { team: any }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [members, setMembers] = useState(team.members || []);

  const handleFileChange = async (memberId: string, type: 'front' | 'back', file: File) => {
    if (!file) return;
    
    // Validar tipo (imagem)
    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecione apenas imagens (JPG, PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem não pode ter mais que 5MB. Reduza a qualidade da foto ou corte nas bordas.");
      return;
    }

    const key = `${memberId}-${type}`;
    setUploading(key);
    
    try {
      const formData = new FormData();
      formData.append('teamId', team.id);
      formData.append('memberId', memberId);
      formData.append('type', type);
      formData.append('file', file);

      const res = await fetch('/api/jogos/documentos/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update state locally
      setMembers(members.map((m: any) => {
        if (m.id === memberId) {
          return {
            ...m,
            [type === 'front' ? 'idFrontUrl' : 'idBackUrl']: data.url
          };
        }
        return m;
      }));
    } catch (e: any) {
      alert(e.message || "Erro no upload da imagem");
    } finally {
      setUploading(null);
    }
  };

  const isAllComplete = members.every((m: any) => m.idFrontUrl && m.idBackUrl);

  return (
    <div className="space-y-6">
      
      {isAllComplete && (
        <div className="p-6 bg-emerald-50 text-emerald-800 border-2 border-emerald-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between shadow-sm animate-in zoom-in-95">
          <div className="flex items-center gap-4">
             <CheckCircle2 className="w-10 h-10 shrink-0 text-emerald-600" />
             <div>
               <h3 className="font-bold text-lg">Pronto para a Quadra!</h3>
               <p className="text-sm font-medium opacity-90">Todos os documentos foram enviados com sucesso, a equipe está 100% regularizada.</p>
             </div>
          </div>
        </div>
      )}

      {!isAllComplete && (
        <div className="p-4 bg-orange-50 text-orange-800 border-l-4 border-orange-500 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium">Você precisa enviar a <strong className="font-bold">Frente e o Verso do RG</strong> de cada um dos membros da equipe. Clique nos botões para abrir a câmera ou galeria do celular.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m: any) => {
          const isComplete = m.idFrontUrl && m.idBackUrl;
          
          return (
            <div key={m.id} className={`bg-white p-6 rounded-3xl border shadow-sm transition-all ${isComplete ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-bold text-lg text-slate-800 leading-tight truncate">{m.student.nome}</h3>
                  <p className="text-sm text-slate-500">{m.student.matricula} • {m.student.turma?.nome}</p>
                </div>
                {m.isLeader && <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase shrink-0">Líder</span>}
              </div>

              <div className="space-y-3">
                <UploadBox 
                  type="front" label="Frente do RG" 
                  url={m.idFrontUrl} memberId={m.id} 
                  uploading={uploading} onUpload={handleFileChange} 
                />
                <UploadBox 
                  type="back" label="Verso do RG" 
                  url={m.idBackUrl} memberId={m.id} 
                  uploading={uploading} onUpload={handleFileChange} 
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function UploadBox({ type, label, url, memberId, uploading, onUpload }: any) {
  const isUploading = uploading === `${memberId}-${type}`;
  const hasUrl = !!url;

  return (
    <label className={`
      relative overflow-hidden group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer
      ${hasUrl ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50' : 
        isUploading ? 'border-indigo-200 bg-indigo-50' : 
        'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
      }
    `}>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        capture="environment"
        disabled={isUploading}
        onChange={(e) => onUpload(memberId, type, e.target.files?.[0])}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Enviando...</span>
        </div>
      ) : hasUrl ? (
        <div className="flex flex-col items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">{label} Salva!</span>
          <span className="text-[10px] text-emerald-500 font-medium underline opacity-0 group-hover:opacity-100 transition-opacity">Toque para trocar</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
          <Camera className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Tirar {label}</span>
        </div>
      )}
    </label>
  );
}
