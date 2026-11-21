// Usage: npm run create-admin -- <email> <password>
// Creates an admin user, or resets the password and role if the email exists.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../services/db');

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password>');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { password: hashed, role: 'admin' },
    create: { email: email.toLowerCase(), password: hashed, role: 'admin' },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
