'use server'

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Usamos barras dobles (\\) para escapar la ruta en el string de Windows
const COMPOSE_FILE = 'C:\\Users\\jon14\\OneDrive\\Desktop\\RUBEN_BD\\docker-compose.yml';

export async function controlContainer(service: string, action: 'start' | 'stop') {
  try {
    // En Windows, es más seguro envolver la ruta del archivo entre comillas dobles
    const command = action === 'start'
      ? `docker compose -f "${COMPOSE_FILE}" up -d ${service}`
      : `docker compose -f "${COMPOSE_FILE}" stop ${service}`;

    const { stdout, stderr } = await execAsync(command);

    return { success: true, message: `Operación ${action} en ${service} completada.` };
  } catch (error) {
    console.error(`Error de Docker en ${service}:`, error);
    return { success: false, message: 'Fallo al ejecutar en el sistema operativo.' };
  }
}

export async function checkContainerStatus(service: string) {
  try {
    const containerName = getContainerName(service);
    const { stdout } = await execAsync(`docker inspect -f "{{.State.Running}}" ${containerName}`);
    return stdout.trim() === 'true';
  } catch (error) {
    return false;
  }
}

function getContainerName(service: string) {
  const names: Record<string, string> = {
    mysql: 'db_mysql_container',
    sqlserver: 'sqlserver_container',
    postgresql: 'postgresql_container',
    mongodb: 'mongodb_container',
    cassandra: 'cassandra_container'
  };
  return names[service];
}
