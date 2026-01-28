
import React, { useState, useEffect } from 'react';
import { processVoiceCommand } from '../services/geminiService';

interface VoiceAIProps {
  onAction: (action: any) => void;
}

export const VoiceAI: React.FC<VoiceAIProps> = ({ onAction }) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [feedback, setFeedback] = useState('');

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.start();
    setIsListening(true);
    setFeedback('Escuchando...');

    recognition.onresult = async (event: any) => {
      const command = event.results[0][0].transcript;
      setLastCommand(command);
      setFeedback('Procesando con IA...');
      
      const result = await processVoiceCommand(command);
      setFeedback(result.summary);
      onAction(result);
      setIsListening(false);
      
      setTimeout(() => setFeedback(''), 5000);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setFeedback('Error al escuchar.');
    };
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      {feedback && (
        <div className="bg-white/90 backdrop-blur shadow-xl p-4 rounded-3xl border border-sky-100 max-w-[200px] text-sm animate-fadeIn">
          {feedback}
        </div>
      )}
      <button
        onClick={startListening}
        className={`${isListening ? 'bg-red-500 scale-110' : 'bg-sky-600'} w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-95`}
      >
        <i className={`fas ${isListening ? 'fa-microphone-lines' : 'fa-microphone'} text-2xl`}></i>
      </button>
    </div>
  );
};
