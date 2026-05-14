import client from './client';

export async function runPipeline({ date, mode = 'rule', numDocks = 5 }) {
  const { data } = await client.post('/api/pipeline/run', {
    date,
    mode,
    num_docks: numDocks,
  });
  return data;
}
