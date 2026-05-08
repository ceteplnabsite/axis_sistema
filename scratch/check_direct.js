
const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: "postgresql://postgres:08CetepaA!%40@db.temluomkwlbvffiwoghj.supabase.co:5432/postgres"
  });
  try {
    await client.connect();
    console.log('Conectado ao banco.');
    
    const res = await client.query('SELECT * FROM estudantes WHERE matricula = $1', ['10563617']);
    console.log('Estudante:', res.rows);
    
    const res2 = await client.query('SELECT * FROM users WHERE username = $1', ['10563617']);
    console.log('Usuário:', res2.rows);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

check();
