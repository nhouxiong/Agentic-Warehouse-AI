import client from './client';

export async function fetchSchedule(date) {
  const { data } = await client.get('/api/schedule', { params: { date } });
  return data;
}
