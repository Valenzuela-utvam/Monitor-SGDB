import { Shield, Terminal as TerminalIcon, Database } from 'lucide-react';
import Orchestrator from '../src/components/Orchestrator';
import Terminal from '../src/components/Terminal';

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#0d0e12] text-white p-8 selection:bg-fuchsia-500 selection:text-white">
      {/* Cabecera */}
      <header className="border-b border-slate-800 pb-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-fuchsia-500" />
          <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-fuchsia-500 via-violet-500 to-coral-500 bg-clip-text text-transparent">
            Monitor de Seguridad SGBD
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-violet-500/30">
          <span className="w-2 h-2 rounded-full bg-coral-500 animate-pulse"></span>
          <span className="text-xs text-fuchsia-100 font-mono">Glitch Core Activo</span>
        </div>
      </header>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Columna Izquierda: Nodos Docker */}
        <div className="xl:col-span-1 bg-[#13151a] border border-slate-800 p-6 rounded-2xl h-fit">
           <h2 className="text-lg font-semibold mb-6 text-violet-400 flex items-center gap-2">
            <Database className="w-5 h-5" /> Nodos de Bases de Datos
          </h2>
          <Orchestrator />
        </div>

        {/* Columna Central/Derecha: Terminal Dinámica */}
        <div className="xl:col-span-2 bg-[#13151a] border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold mb-4 text-fuchsia-400 flex items-center gap-2">
            <TerminalIcon className="w-5 h-5" /> Consola de Auditoría y Ejecución
          </h2>
          {/* Aquí inyectamos la Terminal que acabamos de armar */}
          <Terminal />
        </div>

      </div>
    </main>
  );
}
