import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { getCredentials } from '@/lib/banking/sync';
import { EnableBankingError, listAspsps } from '@/lib/banking/enablebanking';
import { jsonError, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const country = (new URL(req.url).searchParams.get('country') ?? 'AT').toUpperCase().slice(0, 2);
    const user = await getCurrentUser();
    const credentials = await getCredentials(user.id);
    if (!credentials) return jsonError('Enable Banking ist noch nicht eingerichtet.', 400);

    const { aspsps } = await listAspsps(credentials, country);
    return NextResponse.json(
      aspsps
        .filter((a) => !a.psu_types || a.psu_types.includes('personal'))
        .map((a) => ({
          name: a.name,
          country: a.country,
          logo: a.logo ?? null,
          beta: !!a.beta,
          maxConsentDays: a.maximum_consent_validity ? Math.floor(a.maximum_consent_validity / 86_400) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    );
  } catch (error) {
    if (error instanceof EnableBankingError) return jsonError(error.message, error.status || 502);
    return serverError('GET /banking/aspsps', error);
  }
}
