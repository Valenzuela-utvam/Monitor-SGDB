'use client'

import { useState, useEffect } from 'react';
import { Database, Play, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { controlContainer, checkContainerStatus } from '../actions/docker';

const DATABASES = [
  { id: 'mysql', name: 'MySQL', port: '3308' },
  { id: 'mongodb', name: 'MongoDB', port: '27017' },
  { id: 'sqlserver', name: 'SQL Server', port: '1433' },
  { id: 'postgresql', name: 'PostgreSQL', port: '5433' },
  { id: 'cassandra', name: 'Cassandra', port: '9042' },
];

export default function Orchestrator() {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    DATABASES.forEach(async (db) => {
      const isRunning = await checkContainerStatus(db.id);
      setStatus(prev => ({ ...prev, [db.id]: isRunning }));
    });
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000); 
  };

  const handleToggle = async (service: string, isRunning: boolean) => {
    setLoading(prev => ({ ...prev, [service]: true }));
    const action = isRunning ? 'stop' : 'start';

    const result = await controlContainer(service, action);

    if (result.success) {
      setStatus(prev => ({ ...prev, [service]: !isRunning }));
      showNotification(`Contenedor de ${service} ${action === 'start' ? 'iniciado' : 'detenido'} correctamente.`, 'success');
    } else {
      showNotification(`Error de Glitch al operar ${service}. Revisa Docker.`, 'error');
    }

    setLoading(prev => ({ ...prev, [service]: false }));
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4">
        {DATABASES.map((db) => {
          const isRunning = status[db.id] || false;
          const isLoading = loading[db.id] || false;

          return (
            <div
              key={db.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                isRunning
                  ? 'bg-slate-900/60 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                  : 'bg-slate-900/20 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className={`w-5 h-5 ${isRunning ? 'text-coral-400' : 'text-slate-500'}`} />
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{db.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">Puerto: {db.port}</span>
                </div>
              </div>

              <button
                onClick={() => handleToggle(db.id, isRunning)}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-all ${
                  isLoading ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : isRunning
                    ? 'bg-coral-500/10 text-coral-400 hover:bg-coral-500/20 border border-coral-500/20'
                    : 'bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600/40 border border-fuchsia-500/30'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isRunning ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      
      {notification && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 ${
          notification.type === 'success'
            ? 'bg-violet-900/40 border-violet-500 text-violet-100'
            : 'bg-red-900/40 border-red-500 text-red-100'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-violet-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <p className="font-medium text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}
