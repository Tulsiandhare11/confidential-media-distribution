import { db } from '../db';

export async function logEvent(
  photoId: number,
  eventType: string,
  actorId: number | null,
  details?: object
): Promise<void> {
  await db.run(
    'INSERT INTO audit_log (photo_id, event_type, actor_id, details) VALUES (?, ?, ?, ?)',
    photoId,
    eventType,
    actorId,
    details ? JSON.stringify(details) : null
  );
}

export async function getTimeline(photoId: number) {
  return db.all(
    `SELECT a.event_type, a.actor_id, u.name AS "actorName", a.details, a.created_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.photo_id = ?
     ORDER BY a.created_at ASC`,
    photoId
  );
}