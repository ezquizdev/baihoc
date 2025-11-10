import { query } from "@/application/infra/db/pool";
import type { Subject } from "@/application/models/subject";

type SubjectRow = {
  id: string;
  name: string;
  slug: string;
};

function mapSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

export async function listSubjects(): Promise<Subject[]> {
  const res = await query<SubjectRow>(
    `SELECT id, name, slug FROM subjects ORDER BY name ASC`,
  );
  return res.rows.map(mapSubject);
}
