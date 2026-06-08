import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { Client as CassandraClient } from 'cassandra-driver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { engine, host, port, user, password, database, query } = body;

    if (engine === 'mysql') {
      let connection;
      try {
        connection = await mysql.createConnection({
          host,
          port: Number(port),
          user,
          password,
          database: database || undefined,
          multipleStatements: true,
        });

        const [rows] = await connection.query(query);
        await connection.end();

        // Formatear el resultado para ocultar la metadata gigante de MySQL
        let formattedData: any = rows;
        if (Array.isArray(rows)) {

          if (rows.length > 0 && rows.every((r: any) => r && r.affectedRows !== undefined)) {
            formattedData = `${rows.length} instrucción(es) ejecutada(s) con éxito.`;
          } else {

            formattedData = (rows as any[]).map((r: any) => {
              return (r && r.affectedRows !== undefined)
                ? `Ejecución exitosa: ${r.affectedRows} fila(s) afectada(s).`
                : r;
            });
          }
        } else if (rows && (rows as any).affectedRows !== undefined) {

          formattedData = `Ejecución exitosa: ${(rows as any).affectedRows} fila(s) afectada(s).`;
        }

        return NextResponse.json({ success: true, data: formattedData });
      } catch (dbError: any) {
        if (connection) await connection.end();
        return NextResponse.json({
          success: false,
          error: dbError.message,
          code: dbError.code || 'MYSQL_ERROR'
        }, { status: 400 });
      }
    }

    // ==========================================
    // LÓGICA PARA MONGODB
    // ==========================================
    else if (engine === 'mongodb') {
      const uri = `mongodb://${user}:${password}@${host}:${port}/?authSource=admin`;
      const client = new MongoClient(uri);

      try {
        await client.connect();
        const db = client.db(database || 'admin');

        let commandObj;
        try {
          commandObj = JSON.parse(query);
        } catch (e) {
          return NextResponse.json({ success: false, error: "La consulta para MongoDB debe ser un JSON válido." }, { status: 400 });
        }

        const result = await db.command(commandObj);
        await client.close();
        return NextResponse.json({ success: true, data: result });
      } catch (mongoError: any) {
        await client.close();
        return NextResponse.json({
          success: false,
          error: mongoError.message,
          code: mongoError.code || 'MONGO_AUTH_ERROR'
        }, { status: 400 });
      }
    }

    // ==========================================
    // LÓGICA PARA CASSANDRA
    // ==========================================
    else if (engine === 'cassandra') {
      const client = new CassandraClient({
        contactPoints: [host],
        // La imagen oficial de Docker de Cassandra usa 'datacenter1' por defecto
        localDataCenter: 'datacenter1',
        credentials: { username: user, password: password },
        // En Cassandra las bases de datos se llaman 'keyspaces'
        keyspace: database || undefined
      });

      try {
        await client.connect();
        // Ejecutamos la consulta CQL (Cassandra Query Language)
        const result = await client.execute(query);
        await client.shutdown();

        return NextResponse.json({ success: true, data: result.rows });
      } catch (cassandraError: any) {
        await client.shutdown();
        // Capturamos violaciones de permisos o sintaxis en Cassandra
        return NextResponse.json({
          success: false,
          error: cassandraError.message,
          code: cassandraError.name || 'CASSANDRA_ERROR'
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Motor de base de datos no soportado" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
