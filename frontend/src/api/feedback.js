import client from './client';

export async function submitFeedback({ recommendationId, reason, details }) {
  const { data } = await client.post('/api/feedback', {
    recommendation_id: recommendationId,
    reason,
    details,
  });
  return data;
}

export async function acceptRecommendation(id) {
  const { data } = await client.post(`/api/recommendations/${id}/accept`);
  return data;
}

export async function rejectRecommendation(id, reason) {
  const { data } = await client.post(`/api/recommendations/${id}/reject`, { reason });
  return data;
}
