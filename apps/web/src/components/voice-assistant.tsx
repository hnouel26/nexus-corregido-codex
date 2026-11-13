'use client';

import { useState } from 'react';
import VoiceInput from './voice-input';
import VoiceOutput from './voice-output';

interface VoiceAssistantProps {
  onCommand: (command: string) => void;
  lastResponse?: string;
  isProcessing?: boolean;
}

export default function VoiceAssistant({
  onCommand,
  lastResponse,
  isProcessing = false,
}: VoiceAssistantProps) {
  const [command, setCommand] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleTranscript = (text: string) => {
    setCommand(text);
    onCommand(text);
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 border border-purple-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🎤 Asistente de Voz
        </h3>
        {isProcessing && (
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
            Procesando...
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Voice Input */}
        <div className="flex items-center gap-3">
          <VoiceInput
            onTranscript={handleTranscript}
            isListening={isListening}
            onListeningChange={setIsListening}
            language="es-ES"
          />
        </div>

        {/* Command Display */}
        {command && (
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm mb-1">Comando dictado:</p>
            <p className="text-white">{command}</p>
          </div>
        )}

        {/* Last Response */}
        {lastResponse && (
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <p className="text-green-300 text-sm mb-1">Respuesta:</p>
            <p className="text-white">{lastResponse}</p>
          </div>
        )}

        {/* Voice Output */}
        {lastResponse && !isProcessing && (
          <VoiceOutput
            text={lastResponse}
            language="es-ES"
            onEnd={() => console.log('Speech completed')}
          />
        )}
      </div>

      {/* Quick Commands */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-white/60 text-xs mb-2">Comandos rápidos:</p>
        <div className="flex flex-wrap gap-2">
          {[
            '¿Qué regulaciones aplica a healthcare?',
            'Verificar compliance HIPAA',
            'Generar reporte de compliance mensual',
            'Registrar auditoría de acceso',
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setCommand(cmd);
                onCommand(cmd);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white/80 transition"
            >
              {cmd.slice(0, 35)}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
