const fs = require('fs');

async function migrate() {
  try {
    const sql = fs.readFileSync('./prisma/migration.sql', 'utf8');
    
    console.log('Sending migration request to Vercel...');
    
    // Test URL - will be ready in ~1-2 mins
    const res = await fetch('https://madeenas.vercel.app/api/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sql,
        token: 'madeena-seed-2024'
      })
    });
    
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('BODY:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

migrate();
