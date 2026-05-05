const fs = require('fs/promises');
const zlib = require('zlib');
const { formidable } = require('formidable');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const MAX_BYTES = 10 * 1024 * 1024;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.end(JSON.stringify(body));
}

function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_BYTES,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

async function extractPdf(buffer) {
  try {
    const result = await pdfParse(buffer);
    const text = result.text || '';
    if (text.trim().length > 20) return text;
  } catch (error) {
    console.warn('pdf-parse failed, using fallback extraction', error);
  }

  return fallbackPdfText(buffer);
}

function decodePdfString(value) {
  return value
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ');
}

function fallbackPdfText(buffer) {
  const raw = buffer.toString('latin1');
  const chunks = extractPdfTextOperators(raw);
  chunks.push(...extractPdfStreamText(buffer));

  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPdfTextOperators(raw) {
  const chunks = [];
  const stringPattern = /\(([^()]{2,500})\)\s*(?:Tj|'|"|TJ)/g;
  let match;

  while ((match = stringPattern.exec(raw))) {
    chunks.push(decodePdfString(match[1]));
  }

  return chunks;
}

function extractPdfStreamText(buffer) {
  const raw = buffer.toString('latin1');
  const chunks = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamPattern.exec(raw))) {
    const start = Buffer.byteLength(raw.slice(0, match.index), 'latin1') + match[0].indexOf(match[1]);
    const streamBuffer = buffer.subarray(start, start + Buffer.byteLength(match[1], 'latin1'));
    const candidates = [streamBuffer];

    try {
      candidates.push(zlib.inflateSync(streamBuffer));
    } catch {
      // Some streams are not Flate-compressed; plain parsing still helps.
    }

    for (const candidate of candidates) {
      const content = candidate.toString('latin1');
      chunks.push(...extractPdfTextOperators(content));
      chunks.push(...extractArrayText(content));
    }
  }

  return chunks;
}

function extractArrayText(content) {
  const chunks = [];
  const arrayPattern = /\[((?:\s*(?:\([^)]*\)|<[^>]+>|-?\d+(?:\.\d+)?)\s*)+)\]\s*TJ/g;
  let match;

  while ((match = arrayPattern.exec(content))) {
    const parts = [];
    const stringPattern = /\(([^()]*)\)|<([0-9A-Fa-f\s]+)>/g;
    let partMatch;

    while ((partMatch = stringPattern.exec(match[1]))) {
      if (partMatch[1]) {
        parts.push(decodePdfString(partMatch[1]));
      } else if (partMatch[2]) {
        const hex = partMatch[2].replace(/\s+/g, '');
        try {
          parts.push(Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, ''));
        } catch {
          // Ignore malformed hex fragments.
        }
      }
    }

    if (parts.length) chunks.push(parts.join(''));
  }

  return chunks;
}

function firstFile(fileValue) {
  return Array.isArray(fileValue) ? fileValue[0] : fileValue;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const expectedKey = process.env.CV_TEXT_EXTRACTOR_KEY;
  if (expectedKey) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (token !== expectedKey) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
  }

  try {
    const { files } = await parseMultipart(req);
    const file = firstFile(files.file);

    if (!file?.filepath) {
      return sendJson(res, 400, { error: 'file is required' });
    }

    const buffer = await fs.readFile(file.filepath);
    const name = String(file.originalFilename || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    let text = '';

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      text = await extractPdf(buffer);
    } else if (
      mime.includes('officedocument.wordprocessingml.document') ||
      name.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } else {
      return sendJson(res, 415, {
        error: 'Only text-based PDF and DOCX files are supported by this extractor.',
      });
    }

    return sendJson(res, 200, { text: text.trim() });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Text extraction failed',
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
