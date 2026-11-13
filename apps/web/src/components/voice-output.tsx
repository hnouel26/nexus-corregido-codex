'use client';

import { useRef, useEffect } from 'react';

interface VoiceOutputProps {
  text: string;
  language?: string;
  onEnd?: () => void;
}

export default function VoiceOutput({ text, language = 'es-ES', onEnd }: VoiceOutputProps) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!text || typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    if (!synth) {
      console.warn('Text-to-speech no soportado en este navegador');
      return;
    }

    // Cancel any previous speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('Error de text-to-speech:', event.error);
      onEnd?.();
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);

    return () => {
      synth.cancel();
    };
  }, [text, language, onEnd]);

  return null; // Componente invisible, solo reproduce audio
}
