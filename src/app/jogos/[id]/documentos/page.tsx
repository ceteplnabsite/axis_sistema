import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DocumentosClient from "@/app/jogos/[id]/documentos/DocumentosClient";

export default async function DocumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.sportsTeam.findUnique({
    where: { id },
    include: {
      modality: true,
      members: {
        include: {
          student: true
        }
      }
    }
  });

  if (!team) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Envio de Documentos</h1>
          <p className="text-slate-500">Equipe "{team.nome}" • {team.modality.nome}</p>
        </div>

        <DocumentosClient team={JSON.parse(JSON.stringify(team))} />

      </div>
    </div>
  );
}
