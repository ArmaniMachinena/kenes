// KENES: anonymous usage events -> D1. No IP, no names, no cookies.
const OK = new Set(['visit','route','person','board','region','org','search','bday','event','out','lang','country','pdf','login']);
export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response('no db', { status: 503 });
  let b; try { b = await request.json(); } catch { return new Response('bad', { status: 400 }); }
  const sid = String(b.sid || '').slice(0, 24);
  if (!/^[a-z0-9]{6,24}$/i.test(sid) || !Array.isArray(b.e)) return new Response('bad', { status: 400 });
  const cc = (request.cf && request.cf.country) || '';
  const now = Date.now(), day = new Date(now + 5 * 3600e3).toISOString().slice(0, 10); // Astana time
  const rows = b.e.slice(0, 40).filter(x => Array.isArray(x) && OK.has(x[0]))
    .map(x => env.DB.prepare('INSERT INTO ev(day,ts,sid,cc,ev,d) VALUES(?,?,?,?,?,?)')
      .bind(day, now, sid, cc, x[0], String(x[1] ?? '').slice(0, 160)));
  if (rows.length) await env.DB.batch(rows);
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
