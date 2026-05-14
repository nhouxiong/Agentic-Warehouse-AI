import client from './client';

export async function fetchHistory(days = 30) {
  const { data } = await client.get('/api/history', { params: { days } });
  return data;
}

export async function fetchCarriers() {
  const { data } = await client.get('/api/carriers');
  return data;
}

export async function fetchMlModels() {
  const { data } = await client.get('/api/ml/models');
  return data;
}

export async function fetchKpiCompare(date, compare) {
  const { data } = await client.get('/api/kpis/compare', { params: { date, compare } });
  return data;
}

export async function fetchInsights() {
  const { data } = await client.get('/api/insights');
  return data;
}

export async function fetchRecommendationOutcomes() {
  const { data } = await client.get('/api/recommendation_outcomes');
  return data;
}
