/**
 * Types de la base Supabase, écrits à la main d'après
 * supabase/migrations/20261021000000_init.sql.
 *
 * Une fois le projet Supabase lié, tu peux les régénérer avec :
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TaskCategory = "sante" | "sport" | "maison" | "achats" | "bien_etre" | "autre";
export type TaskMoment = "matin" | "midi" | "apres_midi" | "soir" | "journee";
export type RecurrenceKind = "once" | "daily" | "weekdays" | "interval" | "monthly";
export type MoneyKind = "depense" | "recette";
export type LineStatus = "pending" | "sent";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  moment: TaskMoment;
  note: string | null;
  recurrence: RecurrenceKind;
  due_on: string | null;
  weekdays: number[] | null;
  every_days: number | null;
  month_day: number | null;
  starts_on: string;
  ends_on: string | null;
  paused: boolean;
  done_on: string | null;
  finance_enabled: boolean;
  finance_ask: boolean;
  finance_amount_cents: number | null;
  finance_kind: MoneyKind;
  finance_label: string | null;
  finance_category: string | null;
  finance_account: string | null;
  created_at: string;
  updated_at: string;
};

/** Champs qu'un formulaire peut écrire (le reste est géré par la base) */
export type TaskWritable = Omit<TaskRow, "id" | "user_id" | "created_at" | "updated_at">;

export type CompletionRow = {
  id: string;
  user_id: string;
  task_id: string;
  day: string;
  created_at: string;
};

export type TresoLineRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  completion_id: string | null;
  day: string;
  label: string;
  amount_cents: number;
  category: string | null;
  account: string | null;
  task_title: string | null;
  status: LineStatus;
  sent_at: string | null;
  tresorerie_id: number | null;
  created_at: string;
  updated_at: string;
};

export type SyncTokenRow = {
  id: string;
  user_id: string;
  label: string;
  token_hash: string;
  hint: string;
  created_at: string;
  last_used_at: string | null;
};

export type PendingLine = Pick<TresoLineRow, "id" | "day" | "label" | "amount_cents" | "category" | "account" | "task_title">;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, "id"> & Partial<ProfileRow>, Partial<Pick<ProfileRow, "display_name">>>;
      tasks: Table<
        TaskRow,
        Pick<TaskRow, "title"> & Partial<TaskWritable>,
        Partial<TaskWritable>
      >;
      completions: Table<CompletionRow, Pick<CompletionRow, "task_id" | "day">, never>;
      treso_lines: Table<
        TresoLineRow,
        Pick<TresoLineRow, "day" | "label" | "amount_cents"> & Partial<Pick<TresoLineRow, "category" | "account" | "task_title">>,
        Partial<Pick<TresoLineRow, "day" | "label" | "amount_cents" | "category" | "account" | "status" | "sent_at">>
      >;
      sync_tokens: Table<SyncTokenRow, never, never>;
    };
    Views: { [_ in never]: never };
    Functions: {
      complete_task: {
        Args: {
          p_task_id: string;
          p_day: string;
          p_with_line?: boolean;
          p_amount_cents?: number | null;
          p_kind?: MoneyKind | null;
          p_label?: string | null;
          p_category?: string | null;
          p_account?: string | null;
        };
        Returns: { completion_id: string; line_id: string | null; already: boolean };
      };
      uncomplete_task: {
        Args: { p_task_id: string; p_day: string };
        Returns: { removed_lines: number; kept_sent_lines: number };
      };
      create_sync_token: { Args: { p_label?: string }; Returns: string };
      sync_pending_lines: { Args: { p_token: string }; Returns: PendingLine[] };
      sync_mark_sent: { Args: { p_token: string; p_line_id: string; p_tresorerie_id: number }; Returns: boolean };
    };
    Enums: {
      task_category: TaskCategory;
      task_moment: TaskMoment;
      recurrence_kind: RecurrenceKind;
      money_kind: MoneyKind;
      line_status: LineStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
