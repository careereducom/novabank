const bcrypt = require('bcryptjs');
const prisma = require('./src/config/db');
const creds  = require('./src/config/clientCredentials');

async function update() {
  console.log('Rotating passwords for all client accounts...\n');

  for (const [username, password] of Object.entries(creds)) {
    const hash = await bcrypt.hash(password, 12);
    const result = await prisma.user.updateMany({
      where: { username },
      data:  { passwordHash: hash }
    });

    const status = result.count === 1 ? '✓' : '⚠ not found';
    console.log(`  ${status}  ${username.padEnd(12)}  →  ${password}`);
  }

  console.log('\nDone. All passwords rotated.');
  await prisma.$disconnect();
}

update().catch(e => { console.error(e); process.exit(1); });