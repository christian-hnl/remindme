import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { commitImport, ImportError, parseImportFile, previewImport } from '@/lib/banking/import';
import { jsonError, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * multipart/form-data: file, mode ("preview" | "commit"), accounts (JSON array of account names).
 * The file is sent twice (preview, then commit) so the server keeps no upload state.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!form || !(file instanceof File)) return jsonError('Bitte eine Datei auswählen');
  if (file.size > MAX_FILE_BYTES) return jsonError('Die Datei ist größer als 10 MB');

  try {
    const user = await getCurrentUser();
    const parsed = await parseImportFile(Buffer.from(await file.arrayBuffer()), file.name);

    if (form.get('mode') !== 'commit') return NextResponse.json(await previewImport(user.id, parsed));

    let names: string[] = [];
    try {
      const selected = JSON.parse(String(form.get('accounts') ?? '[]'));
      if (Array.isArray(selected)) names = selected.map(String);
    } catch {
      // fall back to all accounts
    }
    if (names.length === 0) names = Array.from(new Set(parsed.transactions.map((t) => t.accountName)));
    return NextResponse.json(await commitImport(user.id, parsed, names));
  } catch (error) {
    if (error instanceof ImportError) return jsonError(error.message, 422);
    return serverError('POST /banking/import', error, 'Import fehlgeschlagen');
  }
}
