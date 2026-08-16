import client from './client';
import type { Reward } from '../types';
export const getRewards = (): Promise<Reward[]> => client.get('/rewards').then((r) => r.data);
