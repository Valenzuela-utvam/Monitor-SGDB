'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, Cpu, Sparkles, Bot, TerminalSquare, Copy, Trash2, Database } from 'lucide-react';

export default function Terminal() {
  const [formData, setFormData] = useState({
    engine: 'mysql',
    host: 'localhost',
    port: '3308',
    user: 'root',
    password: 'root',
    database: '',
    query: ''
  });


  const [dbLogs, setDbLogs] = useState<{text: string, type: 'info' | 'success' | 'error' | 'warn' | 'ai', data?: any[]}[]>([
    { text: 'TERMINAL SGBD. A la espera de comandos...', type: 'info' }
  ]);
  const [chatLogs, setChatLogs] = useState<{text: string, type: 'user' | 'ai' | 'error'}[]>([
    { text: 'SISTEMA INICIADO. Hola, soy Glitch. ¿Qué necesitas consultar o auditar en tus bases de datos?', type: 'ai' }
  ]);
  const [aiPrompt, setAiPrompt] = useState('');

  const [isExecuting, setIsExecuting] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const dbLogsEndRef = useRef<HTMLDivElement>(null);
  const chatLogsEndRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addDbLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' | 'ai', data?: any[]) => {
    setDbLogs(prev => [...prev, { text, type, data }]);
  };

  const clearDbLogs = () => {
    setDbLogs([{ text: 'TERMINAL SGBD. A la espera de comandos...', type: 'info' }]);
  };

  const clearChatLogs = () => {
    setChatLogs([{ text: 'SISTEMA INICIADO. Hola, soy Glitch. ¿Qué necesitas consultar o auditar en tus bases de datos?', type: 'ai' }]);
  };

  useEffect(() => {
    dbLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbLogs]);

  useEffect(() => {
    chatLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);


  const handleUseCommand = (text: string) => {
    const codeMatch = text.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/);
    const commandToUse = codeMatch ? codeMatch[1].trim() : text.trim();
    setFormData(prev => ({ ...prev, query: commandToUse }));
  };


  const handleResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`El servidor no devolvió JSON válido. Código: ${res.status}. Revisa la consola de tu terminal Node.`);
    }
  };


  const executeCommand = async () => {
    if (!formData.query) return;
    setIsExecuting(true);
    addDbLog(`> Ejecutando en ${formData.engine}...`, 'info');

    try {

      addDbLog('Analizando privilegios...', 'info');
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: formData.query, engine: formData.engine, userRole: formData.user })
      });

      const auditData = await handleResponse(auditRes);

      if (!auditData.allowed) {
        addDbLog(`BLOQUEO DE SEGURIDAD (${auditData.riskLevel}): ${auditData.reason}`, 'error');
        if (auditData.suggestedFix) addDbLog(`Sugerencia: ${auditData.suggestedFix}`, 'warn');
        setIsExecuting(false);
        return;
      }


      const execRes = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const execData = await handleResponse(execRes);

      if (execData.success) {
        if (typeof execData.data === 'string') {
          addDbLog(`Éxito:\n${execData.data}`, 'success');
        } else if (Array.isArray(execData.data) && execData.data.length > 0 && typeof execData.data[0] === 'object') {
          addDbLog(`Éxito: ${execData.data.length} fila(s) devuelta(s).`, 'success', execData.data);
        } else if (Array.isArray(execData.data) && execData.data.length === 0) {
          addDbLog(`Éxito: 0 filas devueltas.`, 'success');
        } else {
          addDbLog(`Éxito:\n${JSON.stringify(execData.data, null, 2)}`, 'success');
        }
      } else {
        addDbLog(`Error del SGBD: ${execData.error}`, 'error');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      addDbLog(`Fallo: ${msg}`, 'error');
    }
    setIsExecuting(false);
  };


  const askGemini = async () => {
    if (!aiPrompt.trim()) return;
    setIsAsking(true);

    const userMessage = aiPrompt;
    setAiPrompt('');
    setChatLogs(prev => [...prev, { text: userMessage, type: 'user' }]);
    setChatLogs(prev => [...prev, { text: `> Consultando sobre ${formData.engine}...`, type: 'info' as any }]); // Log temporal visual

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, engine: formData.engine })
      });

      const chatData = await handleResponse(chatRes);

      if (chatData.success) {
        setChatLogs(prev => {
          const newLogs = [...prev];
          newLogs[newLogs.length - 1] = { text: chatData.reply, type: 'ai' }; // Reemplazar el "> Consultando..."
          return newLogs;
        });
      } else {
        setChatLogs(prev => [...prev, { text: `Error de IA: ${chatData.error}`, type: 'error' }]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setChatLogs(prev => [...prev, { text: `Fallo de IA: ${msg}`, type: 'error' }]);
    }
    setIsAsking(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Formulario de Conexión Mejorado */}
      <div className="bg-[#0a0b0e] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300">Configuración de Conexión</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <select name="engine" value={formData.engine} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 focus:border-fuchsia-500 outline-none transition-colors">
            <option value="mysql">MySQL</option>
            <option value="mongodb">MongoDB</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="sqlserver">SQL Server</option>
            <option value="cassandra">Cassandra</option>
          </select>
          <input name="host" placeholder="Host" value={formData.host} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-fuchsia-500 transition-colors" />
          <input name="port" placeholder="Puerto" value={formData.port} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-fuchsia-500 transition-colors" />
          <input name="user" placeholder="Usuario" value={formData.user} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-fuchsia-500 transition-colors" />
          <input name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-fuchsia-500 transition-colors" />
          <input name="database" placeholder="DB (Opcional)" value={formData.database} onChange={handleInputChange} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-fuchsia-500 transition-colors" />
        </div>
      </div>

      {/* Paneles Divididos: Chat IA | Terminal DB */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">

        {/* PANEL IZQUIERDO: CHAT IA */}
        <div className="flex flex-col bg-[#0a0b0e] border border-slate-800 rounded-xl overflow-hidden shadow-lg h-full">
          <div className="bg-slate-900/60 p-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Bot className="w-4 h-4 text-fuchsia-400" />
              <h3 className="font-semibold text-fuchsia-100 text-sm">Asistente Glitch IA</h3>
            </div>
            <button onClick={clearChatLogs} title="Limpiar Chat" className="p-1 text-slate-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
            {chatLogs.map((log, index) => (
              <div key={index} className={`flex ${log.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl break-words whitespace-pre-wrap ${
                  log.type === 'user' ? 'bg-violet-600 text-white' :
                  log.type === 'error' ? 'bg-red-900/40 text-red-200 border border-red-800/50' :
                  (log.type as string) === 'info' ? 'bg-transparent text-slate-500 text-xs italic' :
                  'bg-slate-800 text-slate-200 border border-slate-700/50 shadow-md'
                }`}>
                  {log.text}
                  {/* Botón para enviar código a la terminal */}
                  {log.type === 'ai' && (
                    <button
                      onClick={() => handleUseCommand(log.text)}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-xs font-medium rounded-lg transition-colors border border-fuchsia-500/30"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Usar este comando
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatLogsEndRef} />
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askGemini()}
              placeholder={`Pregunta a Glitch sobre ${formData.engine}...`}
              className="flex-1 bg-black border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-fuchsia-500 text-slate-200 transition-colors"
            />
            <button onClick={askGemini} disabled={isAsking} className="bg-slate-800 hover:bg-slate-700 text-fuchsia-400 border border-fuchsia-500/30 px-4 py-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
              {isAsking ? <Cpu className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: TERMINAL SGBD */}
        <div className="flex flex-col bg-black border border-slate-800 rounded-xl overflow-hidden shadow-lg h-full">
          <div className="bg-slate-900/60 p-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <TerminalSquare className="w-4 h-4 text-violet-400" />
              <h3 className="font-semibold text-violet-100 text-sm">Ejecución SGBD</h3>
            </div>
            <button onClick={clearDbLogs} title="Limpiar Terminal" className="p-1 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs shadow-inner">
            {dbLogs.map((log, index) => (
              <div key={index} className="flex flex-col gap-1 p-1 rounded">
                <div className="flex gap-3 items-start">
                  <span className="text-slate-600 shrink-0 mt-0.5">[{new Date().toLocaleTimeString()}]</span>
                  <div className={`break-words whitespace-pre-wrap ${
                    log.type === 'error' ? 'text-coral-500' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warn' ? 'text-yellow-400' :
                    'text-slate-400'
                  }`}>
                    {log.text}
                  </div>
                </div>

                {log.data && (
                  <div className="overflow-x-auto mt-2 ml-14 border border-slate-700/50 rounded bg-[#0f111a]">
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(log.data[0]).map((key) => (
                            <th key={key} className="border-b border-slate-700 bg-slate-800/80 p-2 font-semibold text-slate-300 whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {log.data.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} className="border-b border-slate-800 p-2 text-slate-400 whitespace-nowrap">
                                {val !== null && val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : <span className="italic text-slate-600">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <div ref={dbLogsEndRef} />
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex flex-col gap-2">
            <textarea
              name="query"
              placeholder={`Comando para ${formData.engine}...`}
              value={formData.query}
              onChange={handleInputChange}
              className="w-full h-24 bg-[#0a0b0e] border border-slate-700 rounded-xl p-3 text-sm font-mono text-violet-300 outline-none focus:border-violet-500 resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button
                onClick={executeCommand}
                disabled={isExecuting}
                className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-violet-900/20"
              >
                {isExecuting ? <Cpu className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Ejecutar Comando 
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
