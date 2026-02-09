import { Pool } from 'pg';
import { config } from '../config/config';

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export const query = <T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> => {
  return pool.query(text, params);
};
