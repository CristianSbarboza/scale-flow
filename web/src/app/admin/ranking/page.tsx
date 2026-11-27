import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getQuizDashboard } from "@/lib/actions/quiz";
import PageHeader from "@/components/ui/PageHeader";
import QuizRankingBoard from "@/components/QuizRankingBoard";

export default async function AdminQuizRankingPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const data = await getQuizDashboard();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ranking do Desafio"
        subtitle="Acompanhe a pontuação mensal e a constância diária de todos os servos no desafio bíblico."
      />
      <QuizRankingBoard data={data} showSelfHighlight={false} />
    </div>
  );
}
