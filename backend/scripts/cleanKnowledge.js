// Re-cleans knowledge documents saved before cleaning was added.
//   node scripts/cleanKnowledge.js           show what would change (no writes)
//   node scripts/cleanKnowledge.js --apply   save the cleaned text
require('dotenv').config();
const prisma = require('../services/db');
const { cleanKnowledgeText } = require('../services/knowledgeText');

(async () => {
  const apply = process.argv.includes('--apply');
  const docs = await prisma.knowledge.findMany({ select: { id: true, title: true, type: true, content: true } });
  let changed = 0;
  for (const d of docs) {
    if (!d.content || String(d.type || '').toUpperCase() === 'JSON') continue;
    const cleaned = cleanKnowledgeText(d.content);
    if (cleaned === d.content) continue;
    changed++;
    console.log(`${apply ? 'Cleaned' : 'Would clean'}: ${d.title || d.id} (${d.content.length} -> ${cleaned.length} chars)`);
    if (apply) await prisma.knowledge.update({ where: { id: d.id }, data: { content: cleaned } });
  }
  console.log(`${docs.length} documents, ${changed} ${apply ? 'cleaned' : 'would change'}.`);
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error(err.message);
  await prisma.$disconnect();
  process.exit(1);
});
