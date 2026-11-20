require('dotenv').config({ path: '.env.dev' });

const mysql = require('mysql2/promise');

const testConnection = async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT, 
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    
    console.log('Tentando conectar com o usuário:', process.env.MYSQL_USER); // Log para depuração

    const connection = await pool.getConnection();
    console.log('Conexão bem-sucedida!');
    
    connection.release();
    await pool.end();
    
  } catch (error) {
    console.error('Erro na conexão:', error.sqlMessage || error.message);
  }
}

testConnection();