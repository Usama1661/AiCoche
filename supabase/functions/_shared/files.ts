export const CV_BUCKET = 'cv-documents';
export const MAX_CV_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function validateCvFile(fileName: string, mimeType: string, size: number) {
  const normalizedName = fileName.toLowerCase();
  const hasAllowedExtension =
    normalizedName.endsWith('.pdf') ||
    normalizedName.endsWith('.doc') ||
    normalizedName.endsWith('.docx');

  if (!hasAllowedExtension || !ALLOWED_CV_MIME_TYPES.has(mimeType)) {
    return 'Only PDF, DOC, and DOCX resume files are supported.';
  }

  if (size <= 0 || size > MAX_CV_BYTES) {
    return 'Resume file must be between 1 byte and 10 MB.';
  }

  return null;
}

export function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 160);
}

export function storagePathFor(userId: string, fileName: string) {
  return `${userId}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}

export async function extractCvText(file: File): Promise<string> {
  const extractorUrl = Deno.env.get('CV_TEXT_EXTRACTOR_URL');
  const extractorKey = Deno.env.get('CV_TEXT_EXTRACTOR_KEY');

  if (extractorUrl) {
    const form = new FormData();
    form.append('file', file, file.name);

    const response = await fetch(extractorUrl, {
      method: 'POST',
      headers: extractorKey ? { Authorization: `Bearer ${extractorKey}` } : undefined,
      body: form,
    });

    if (!response.ok) {
      throw new Error(`CV text extractor failed with ${response.status}`);
    }

    const data = (await response.json()) as { text?: string };
    return (data.text ?? '').trim();
  }

  if (file.type === 'text/plain') {
    return (await file.text()).trim();
  }

  return '';
}
