// Autentikasi admin. Dua mode, gagal tertutup:
//  1. Cloudflare Access  -> aktif kalau ACCESS_TEAM_DOMAIN dan ACCESS_AUD diisi (JWT diverifikasi).
//  2. Password (Basic)   -> aktif kalau Access belum dikonfigurasi dan ADMIN_PASSWORD diisi.
// Kalau Access sudah dikonfigurasi, password TIDAK dipakai lagi (tidak ada jalur belakang).
// Kalau keduanya kosong, admin ditolak (503).

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

// Perbandingan waktu-konstan: bandingkan digest SHA-256 (panjang selalu sama), lalu XOR semua byte.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const challenge = () =>
  new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });

// Basic auth: browser menampilkan dialog login sendiri, tidak perlu ubah UI.
// Username bebas (diabaikan kecuali ADMIN_USER diisi); yang dicek adalah password.
async function checkPassword(request, env) {
  const expected = String(env.ADMIN_PASSWORD || '');
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return challenge();

  let user = '';
  let pass = '';
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0)));
    const i = decoded.indexOf(':');
    if (i < 0) return challenge();
    user = decoded.slice(0, i);
    pass = decoded.slice(i + 1);
  } catch {
    return challenge();
  }

  const passOk = await safeEqual(pass, expected);
  const wantUser = String(env.ADMIN_USER || '');
  const userOk = wantUser ? await safeEqual(user, wantUser) : true;
  return passOk && userOk ? null : challenge();
}

/** Return null kalau boleh lewat, atau Response penolakan. */
export async function requireAccess({ request, env }) {
  if (env.DEV_BYPASS_AUTH === '1') return null; // hanya untuk .dev.vars lokal

  const team = String(env.ACCESS_TEAM_DOMAIN || '').trim();
  const aud = String(env.ACCESS_AUD || '').trim();

  // Mode 1: Cloudflare Access (prioritas kalau sudah dikonfigurasi)
  if (team && aud) {
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

  // Mode 2: password sederhana
  if (String(env.ADMIN_PASSWORD || '')) return checkPassword(request, env);

  return new Response('Admin dinonaktifkan: set ADMIN_PASSWORD atau konfigurasi Cloudflare Access.', { status: 503 });
}

export function sameOriginOk(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // curl / server-to-server; autentikasi tetap wajib lolos
  return origin === new URL(request.url).origin;
}
