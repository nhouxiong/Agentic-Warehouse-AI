import client from './client';

export async function fetchAuditLog(date) {
  const { data } = await client.get('/api/audit', { params: { date } });
  return data;
}

export async function undoAction(actionId) {
  const { data } = await client.post('/api/undo', { action_id: actionId });
  return data;
}

export async function fetchNotes(entity) {
  const { data } = await client.get('/api/notes', { params: { entity } });
  return data;
}

export async function createNote({ entity, text, expiresIn }) {
  const { data } = await client.post('/api/notes', { entity, text, expires_in: expiresIn });
  return data;
}

export async function searchAll(q) {
  const { data } = await client.get('/api/search', { params: { q } });
  return data;
}
