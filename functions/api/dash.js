// KENES: stats for the private dashboard. Needs header x-key == env.DASH_KEY.
export async function onRequestGet({ request, env }) {
  const key = request.headers.get('x-key') || '';
  if (!env.DASH_KEY || key !== env.DASH_KEY) return new Response('forbidden', { status: 403 });
  if (!env.DB) return Response.json({ error: 'no db' }, { status: 503 });
  const url = new URL(request.url);
  const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('day') || '') ? url.searchParams.get('day') : today;
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results);
  const [series, cc, evs, last, tot] = await Promise.all([
    q("SELECT day, COUNT(DISTINCT sid) u, COUNT(*) n FROM ev WHERE day>=date(?,'-13 days') AND day<=? GROUP BY day ORDER BY day", day, day),
    q("SELECT cc, COUNT(DISTINCT sid) u FROM ev WHERE day=? GROUP BY cc ORDER BY u DESC", day),
    q("SELECT ev, d, COUNT(*) n, COUNT(DISTINCT sid) u FROM ev WHERE day=? AND ev!='visit' GROUP BY ev,d ORDER BY n DESC LIMIT 400", day),
    q("SELECT ts, sid, cc, ev, d FROM ev WHERE day=? ORDER BY ts DESC LIMIT 150", day),
    q("SELECT COUNT(DISTINCT sid) u, COUNT(*) n, MIN(day) since FROM ev")
  ]);
  const visits = await q("SELECT d, COUNT(DISTINCT sid) u FROM ev WHERE day=? AND ev='visit' GROUP BY d ORDER BY u DESC", day);
  return Response.json({ day, today, series, cc, evs, last, visits, total: tot[0] }, { headers: { 'cache-control': 'no-store' } });
}
