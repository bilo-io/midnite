'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> & { length: number } }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionHook {
  supported: boolean;
  listening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(options: {
  onFinal: (text: string) => void;
}): SpeechRecognitionHook {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(options.onFinal);

  useEffect(() => {
    onFinalRef.current = options.onFinal;
  }, [options.onFinal]);

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
      if (finalText) {
        onFinalRef.current(finalText);
        setInterim('');
      }
    };
    rec.onerror = () => {
      setListening(false);
      setInterim('');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.start();
      setListening(true);
    } catch {
      // already started
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    setListening(false);
  }, []);

  return { supported, listening, interim, start, stop };
}
