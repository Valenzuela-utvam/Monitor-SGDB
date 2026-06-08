import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { Client } from 'basic-ftp';
import { Readable } from 'stream';

async function generateBackupSQL(host: string, port: number, user: string, password: string, database: string): Promise<string> {
  const connection = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });

  let sql = `-- Backup: ${database} - ${new Date().toLocaleString('es-MX')}\n\n`;
  sql += `CREATE DATABASE IF NOT EXISTS \`${database}\`;\nUSE \`${database}\`;\n\n`;

  const [tables] = await connection.query(`SHOW TABLES`) as any;
  const tableKey = `Tables_in_${database}`;

  for (const row of tables) {
    const tableName = row[tableKey];
    const [createRows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``) as any;
    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n${createRows[0]['Create Table']};\n\n`;

    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``) as any;
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]).map((c: string) => `\`${c}\``).join(', ');
      const values = rows.map((r: any) =>
        '(' + Object.values(r).map((v: any) =>
          v === null ? 'NULL' : `'${String(v).replace(/'/g, "\\'")}'`
        ).join(', ') + ')'
      ).join(',\n  ');
      sql += `INSERT INTO \`${tableName}\` (${cols}) VALUES\n  ${values};\n\n`;
    }
  }

  await connection.end();
  return sql;
}

export async function POST(req: Request) {
  const client = new Client(30000);
  client.ftp.verbose = false;

  try {
    const body = await req.json();
    const { mysqlHost, mysqlPort, mysqlUser, mysqlPassword, database,
            ftpHost, ftpPort, ftpUser, ftpPassword } = body;

    if (!database) return NextResponse.json({ success: false, error: 'Especifica la base de datos.' }, { status: 400 });

    
    const sql = await generateBackupSQL(mysqlHost, Number(mysqlPort), mysqlUser, mysqlPassword, database);
    const filename = `backup_${database}_${new Date().toISOString().slice(0, 10)}.sql`;
    const content = Buffer.from(sql, 'utf-8');


    await client.access({
      host: ftpHost,
      port: Number(ftpPort) || 21,
      user: ftpUser,
      password: ftpPassword,
      secure: true,           
      secureOptions: { rejectUnauthorized: false },
    });


    const stream = Readable.from(content);
    await client.uploadFrom(stream, filename);

    client.close();
    return NextResponse.json({ success: true, message: `Backup "${filename}" subido a ${ftpHost} exitosamente.` });

  } catch (error: any) {
    client.close();
    console.error('ERROR FTP COMPLETO:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      stack: error.stack || ''
    }, { status: 500 });
  }
}
