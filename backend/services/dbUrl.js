// Normalises DATABASE_URL for Supabase (or any Postgres) and derives DIRECT_URL.
//
// Supabase offers two poolers on the same host:
//   - session mode, port 5432: behaves like a direct connection; everything works.
//   - transaction mode, port 6543: connections are shared between transactions, so
//     Prisma must not use named prepared statements (pgbouncer=true) and schema
//     changes (prisma db push) must go through a session connection instead.
// Prisma reads DATABASE_URL for queries and DIRECT_URL for schema changes.

const TRANSACTION_POOLER_PORT = '6543';
const SESSION_POOLER_PORT = '5432';

function parse(raw) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function isSupabase(u) {
  return /\.supabase\.(co|com)$/i.test(u.hostname);
}

/** { url, directUrl, mode } for a connection string; unknown formats pass through unchanged. */
function resolveDatabaseUrls(databaseUrl, directUrl) {
  const u = parse(databaseUrl);
  if (!u) return { url: databaseUrl, directUrl: directUrl || databaseUrl, mode: 'unknown' };

  const transaction = u.port === TRANSACTION_POOLER_PORT;
  if (isSupabase(u) && !u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
  if (transaction) {
    if (!u.searchParams.has('pgbouncer')) u.searchParams.set('pgbouncer', 'true');
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '5');
  }

  let direct = directUrl;
  if (!direct) {
    const d = new URL(u.toString());
    if (transaction) {
      d.port = SESSION_POOLER_PORT;
      d.searchParams.delete('pgbouncer');
      d.searchParams.delete('connection_limit');
    }
    direct = d.toString();
  }

  return { url: u.toString(), directUrl: direct, mode: transaction ? 'transaction-pooler' : 'session' };
}

/** Apply to process.env before Prisma (client or CLI) reads it. Idempotent. */
function applyDatabaseUrls() {
  if (!process.env.DATABASE_URL) return null;
  const r = resolveDatabaseUrls(process.env.DATABASE_URL, process.env.DIRECT_URL);
  process.env.DATABASE_URL = r.url;
  process.env.DIRECT_URL = r.directUrl;
  return r;
}

/** Host and mode only, for logs. Never includes credentials. */
function describe(r) {
  const u = parse(r.url);
  return u ? `${u.hostname}:${u.port || '5432'} (${r.mode})` : r.mode;
}

module.exports = { resolveDatabaseUrls, applyDatabaseUrls, describe };
