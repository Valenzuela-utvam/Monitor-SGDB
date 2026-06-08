'use server'

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);


const COMPOSE_FILE = 'C:/Users/NiTo/Documents/Proyectos/db/db.yml';

export async function controlContainer(service: string, action: 'start' | 'stop') {
  try {

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

export async function getContainerStats(service: string) {
  try {
    const containerName = getContainerName(service);
    // El flag --no-stream obtiene la lectura actual y termina el comando. Formato JSON para fácil parseo.
    const { stdout } = await execAsync(`docker stats --no-stream --format "{{json .}}" ${containerName}`);
    const stats = JSON.parse(stdout.trim());
    return {
      success: true,
      cpu: stats.CPUPerc,
      ram: stats.MemUsage,
      ramPerc: stats.MemPerc
    };
  } catch (error) {
    return { success: false, cpu: '0.00%', ram: '0B / 0B', ramPerc: '0.00%' };
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
