import { query } from "@/application/infra/db/pool";
import type { Topic } from "@/application/models/topic";

type TopicRow = {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
};

function mapTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    slug: row.slug,
  };
}

export async function listTopics(
  params: { subjectIds?: string[] } = {},
): Promise<Topic[]> {
  const subjectIds = params.subjectIds?.length ? params.subjectIds : undefined;

  const res = subjectIds
    ? await query<TopicRow>(
        `SELECT id, subject_id, name, slug
         FROM topics
         WHERE subject_id = ANY($1::uuid[])
         ORDER BY name ASC`,
        [subjectIds],
      )
    : await query<TopicRow>(
        `SELECT id, subject_id, name, slug
         FROM topics
         ORDER BY name ASC`,
      );

  return res.rows.map(mapTopic);
}
