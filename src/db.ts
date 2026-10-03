import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function toPgParams(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const db = {
  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    const res = await pool.query(toPgParams(sql), params);
    return res.rows[0] as T | undefined;
  },
  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const res = await pool.query(toPgParams(sql), params);
    return res.rows as T[];
  },
  async run(sql: string, ...params: any[]): Promise<{ lastInsertRowid?: number }> {
    const hasReturning = /returning/i.test(sql);
    const finalSql = hasReturning ? sql : `${sql} RETURNING id`;
    const res = await pool.query(toPgParams(finalSql), params);
    return { lastInsertRowid: res.rows[0]?.id };
  },
};