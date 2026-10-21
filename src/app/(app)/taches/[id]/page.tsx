import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getUserContext } from "@/lib/dal";
import { todayInTimezone } from "@/lib/format";
import { uuid } from "@/lib/validation/schemas";
import { deleteTask, updateTask } from "../actions";
import { TaskForm } from "../task-form";

export const metadata: Metadata = { title: "Modifier la tâche" };

export default function EditTaskPage({ params }: PageProps<"/taches/[id]">) {
  return (
    <>
      <Link href="/taches" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        Toutes les tâches
      </Link>
      <Suspense fallback={<ListSkeleton rows={2} />}>{params.then(({ id }) => <EditContent id={id} />)}</Suspense>
    </>
  );
}

async function EditContent({ id }: { id: string }) {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) notFound();

  const { supabase } = await getUserContext();
  const { data: task, error } = await supabase.from("tasks").select("*").eq("id", parsed.data).maybeSingle();
  if (error) throw new Error(error.message);
  if (!task) notFound();

  return (
    <>
      <PageHeader eyebrow="Modifier" title={task.title} />
      <Panel>
        <TaskForm action={updateTask} task={task} today={todayInTimezone()} />
      </Panel>
      <ActionForm
        action={deleteTask}
        className="mt-6"
        confirmMessage={`Supprimer « ${task.title} » et son historique de coches ? Les lignes Trésorerie déjà préparées sont conservées.`}
      >
        <input type="hidden" name="task_id" value={task.id} />
        <SubmitButton variant="danger" pendingLabel="Suppression…">
          <Trash2 className="size-4" aria-hidden />
          Supprimer la tâche
        </SubmitButton>
      </ActionForm>
    </>
  );
}
