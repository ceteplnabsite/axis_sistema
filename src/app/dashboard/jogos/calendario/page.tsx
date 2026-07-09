import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const matches = await prisma.gameMatch.findMany({
    include: {
      team1: true,
      team2: true,
      modality: true
    },
    orderBy: {
      round: 'asc'
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <ScheduleClient initialMatches={matches} />
    </div>
  );
}
