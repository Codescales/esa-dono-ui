import client from './client';
import type { Event } from '../types';

export const getEvents = (): Promise<Event[]> => client.get('/events').then((r) => r.data);
