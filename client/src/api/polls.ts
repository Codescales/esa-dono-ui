import client from './client';
import type { Poll } from '../types';
export const getPolls = (): Promise<Poll[]> => client.get('/polls').then((r) => r.data);
