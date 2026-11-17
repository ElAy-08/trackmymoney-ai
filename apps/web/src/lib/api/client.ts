import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = createClient<paths>({ baseUrl: API_URL });