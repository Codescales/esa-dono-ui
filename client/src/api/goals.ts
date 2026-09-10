import client from './client';
import type { Goal } from '../types';
export const getGoals = (): Promise<Goal[]> => client.get('/goals').then((r) => r.data);
