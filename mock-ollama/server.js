const http = require('node:http');

const PORT = Number(process.env.PORT || 11434);
const TEXT_MODEL = process.env.MOCK_MODEL || 'mock-extract:latest';
const VISION_MODEL = 'mock-vision:latest';
const FIXED_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/.test(process.env.MOCK_MONTH || '')
  ? process.env.MOCK_MONTH
  : null;
const DEFAULT_DELAY = Number(process.env.MOCK_DELAY_MS || 0);

const MODELS = [
  {
    name: TEXT_MODEL,
    model: TEXT_MODEL,
    modified_at: '2026-01-01T00:00:00Z',
    size: 1073741824,
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    details: { family: 'mock', parameter_size: '7B', quantization_level: 'Q4_0' },
  },
  {
    name: VISION_MODEL,
    model: VISION_MODEL,
    modified_at: '2026-01-01T00:00:00Z',
    size: 2147483648,
    digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    details: { family: 'mock-vision', parameter_size: '7B', quantization_level: 'Q4_0' },
  },
];

let chatCount = 0;

function monthReference(offset = 0) {
  if (FIXED_MONTH) {
    const [year, month] = FIXED_MONTH.split('-').map(Number);
    return { year, month: month - 1 + offset };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + offset };
}

function firstDayOfMonth(offset = 0) {
  const { year, month } = monthReference(offset);
  return new Date(Date.UTC(year, month, 1));
}

function lastDayOfMonth(offset = 0) {
  const { year, month } = monthReference(offset);
  return new Date(Date.UTC(year, month + 1, 0));
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeAmount(raw) {
  if (!raw) {
    return null;
  }
  const compact = raw.replace(/[€\s]/g, '');
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    return null;
  }
  return Number(normalized).toFixed(2);
}

function extract(content) {
  if (content.includes('MOCK_ERREUR')) {
    return { error: true };
  }
  if (content.includes('MOCK_ECHEC')) {
    return {
      error: false,
      content: 'Désolé, je ne peux pas analyser ce document.',
    };
  }
  const text = content.replace(/<document>([\s\S]*?)<\/document>/, '$1');
  const rawAmount = /Montant\s*TTC\s*:\s*([0-9][0-9 .,]*[0-9])/i.exec(text);
  const amount = normalizeAmount(rawAmount ? rawAmount[1] : null);
  const supplier = /Fournisseur\s*:\s*([^\r\n]+)/i.exec(text);
  const expenseType = /Type(?:\s+de\s+frais)?\s*:\s*([^\r\n]+)/i.exec(text);
  const end = /Fin\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(text);
  const start = /Début\s*:\s*(\d{4}-\d{2}-\d{2})/i.exec(text);
  const result = {
    type_suggere: expenseType ? expenseType[1].trim().toLowerCase() : null,
    fournisseur: supplier ? supplier[1].trim() : null,
    numero_facture: null,
    date_facture: null,
    periode_debut: start ? start[1] : iso(firstDayOfMonth()),
    periode_fin: end ? end[1] : iso(lastDayOfMonth()),
    montant_ttc: amount,
    montant_ht: null,
    devise: 'EUR',
    extrait_source: rawAmount ? rawAmount[0].trim() : null,
    confiance: amount ? 'haute' : 'basse',
  };
  return { error: false, content: JSON.stringify(result) };
}

function respond(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) {
        reject(new Error('Body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  if (request.method === 'GET' && url.pathname === '/health') {
    return respond(response, 200, { status: 'ok' });
  }
  if (request.method === 'GET' && url.pathname === '/api/version') {
    return respond(response, 200, { version: '0.0.0-mock' });
  }
  if (request.method === 'GET' && url.pathname === '/api/tags') {
    return respond(response, 200, { models: MODELS });
  }
  if (request.method === 'POST' && url.pathname === '/api/show') {
    let body = {};
    try {
      body = JSON.parse(await readBody(request));
    } catch {
      body = {};
    }
    const vision = String(body.model || '').includes('vision');
    return respond(response, 200, {
      model: body.model || TEXT_MODEL,
      capabilities: vision ? ['completion', 'vision'] : ['completion'],
      details: { family: vision ? 'mock-vision' : 'mock' },
    });
  }
  if (request.method === 'POST' && url.pathname === '/api/chat') {
    let body;
    try {
      body = JSON.parse(await readBody(request));
    } catch {
      return respond(response, 400, { error: 'Invalid JSON body' });
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const user = [...messages].reverse().find((message) => message.role === 'user');
    const content = user && typeof user.content === 'string' ? user.content : '';
    chatCount += 1;
    const result = extract(content);
    const delay = content.includes('MOCK_LENT')
      ? Math.max(DEFAULT_DELAY, 4000)
      : DEFAULT_DELAY;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (result.error) {
      return respond(response, 500, { error: 'Error simulated by mock-ollama' });
    }
    return respond(response, 200, {
      model: body.model || TEXT_MODEL,
      created_at: '2026-01-01T00:00:00Z',
      message: { role: 'assistant', content: result.content },
      done: true,
      total_duration: 1000000,
      eval_count: chatCount,
    });
  }
  return respond(response, 404, {
    error: 'Unknown mock route: ' + request.method + ' ' + url.pathname,
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `mock-ollama listening on http://0.0.0.0:${PORT} (model ${TEXT_MODEL}, month ${FIXED_MONTH ?? 'current'})`,
  );
});
