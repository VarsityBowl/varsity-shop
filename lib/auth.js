// Verifikasi JWT Cloudflare Access. Gagal tertutup: kalau Access belum dikonfigurasi, admin ditolak.

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function verifyJwt(token, team, aud) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('format');
  const header = b64urlToJson(parts[0]);
  const payload = b64urlToJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('alg');

  const res = await fetch(`https://${team}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new Error('certs');
  const { keys } = await res.json();
  const jwk = (keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if (!ok) throw new Error('signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('nbf');
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) throw new Error('aud');
  if (payload.iss !== `https://${team}`) throw new Error('iss');
  return payload;
}

/** Return null kalau boleh lewat, atau Response penolakan. */
export async function requireAccess({ request, env }) {
  if (env.DEV_BYPASS_AUTH === '1') return null; // hanya untuk .dev.vars lokal
  const team = String(env.ACCESS_TEAM_DOMAIN || '').trim();
  const aud = String(env.ACCESS_AUD || '').trim();
  if (!team || !aud) return new Response('Admin dinonaktifkan: Cloudflare Access belum dikonfigurasi.', { status: 503 });

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return new Response('Unauthorized', { status: 401 });
  try {
    const payload = await verifyJwt(token, team, aud);
    const allow = String(env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.includes(String(payload.email || '').toLowerCase())) {
      return new Response('Forbidden', { status: 403 });
    }
    return null;
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}

export function sameOriginOk(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // curl / server-to-server; Access tetap wajib lolos
  return origin === new URL(request.url).origin;
}
