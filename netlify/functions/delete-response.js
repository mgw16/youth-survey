// netlify/functions/delete-response.js
// Deletes a single survey response by ID. Protected by ADMIN_KEY.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  // Auth check
  const provided = event.headers['x-admin-key'];
  if (!provided || provided !== process.env.ADMIN_KEY) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  let id;
  try {
    const body = JSON.parse(event.body);
    id = body.id;
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!id) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing id' }) };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/survey_responses?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase error ${res.status}: ${text}`);
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Delete error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
