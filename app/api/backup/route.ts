import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: Request) {
  try {
    const { host, port, user, password, database } = await req.json();

    if (!database) {
      return NextResponse.json({ success: false, error: 'Debes especificar una base de datos en el campo DB.' }, { status: 400 });
    }

    const connection = await mysql.createConnection({
      host,
      port: Number(port),
      user,
      password,
      database,
      multipleStatements: true,
    });

    let sql = `-- =============================================\n`;
    sql += `-- Backup de la base de datos: ${database}\n`;
    sql += `-- Generado: ${new Date().toLocaleString('es-MX')}\n`;
    sql += `-- =============================================\n\n`;
    sql += `CREATE DATABASE IF NOT EXISTS \`${database}\`;\n`;
    sql += `USE \`${database}\`;\n\n`;

    const [tables] = await connection.query(`SHOW TABLES`) as any;
    const tableKey = `Tables_in_${database}`;

    for (const row of tables) {
      const tableName = row[tableKey];

      const [createRows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``) as any;
      const createStatement = createRows[0]['Create Table'];
      sql += `-- Tabla: ${tableName}\n`;
      sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sql += `${createStatement};\n\n`;

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

    return new Response(sql, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="backup_${database}_${Date.now()}.sql"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
