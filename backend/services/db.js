const { applyDatabaseUrls } = require('./dbUrl');

// Normalise DATABASE_URL / DIRECT_URL before Prisma reads them (Supabase poolers).
applyDatabaseUrls();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
