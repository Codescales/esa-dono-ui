import client from './client';
import type { Stream } from '../types';

export const getStreams = (): Promise<Stream[]> => client.get('/streams').then((r) => r.data);
