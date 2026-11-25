import {
  AlertCircle,
  AudioLines,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Square,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ExpenseCategory, formatCOP } from '../data/budgetData';

export interface RegisteredExpensePayload {
  amount: number;
  date: string;
  description: string;
  category: ExpenseCategory;
}

export interface ChatAttachment {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string; // raw base64 without data: prefix
  previewUrl: string;
  name: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  attachment?: ChatAttachment;
  registeredExpenses?: RegisteredExpensePayload[];
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  budgetContext: {
    monthlyBudget: number;
    totalSpent: number;
    availableBalance: number;
    totalIncome: number;
    todayISO: string;
  };
  onRegisterExpense: (expense: RegisteredExpensePayload) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const SUGGESTIONS = [
  'Gasté 25.000 en almuerzo hoy',
  '¿Me alcanza para comprar unos tenis de 220.000?',
  '¿Cuánto saldo me queda disponible?',
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo.'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo adjunto.'));
    reader.readAsDataURL(blob);
  });
}

function pickSupportedAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function AssistantDrawer({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  budgetContext,
  onRegisterExpense,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Hola, ${userName}. Cuéntame qué gastaste por texto, sube la foto de un recibo o graba una nota de voz. También puedes preguntarme si te alcanza el saldo para una compra.`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // User name inline editor
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(userName);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);

  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const stopAudioTracks = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const stopCameraTracks = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen, pendingAttachment, isCameraOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 160);
      return () => window.clearTimeout(timer);
    } else {
      // Release any active camera/microphone streams when closing drawer
      discardRecordingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopAudioTracks();
      stopCameraTracks();
      setIsRecording(false);
    }
  }, [isOpen, stopAudioTracks, stopCameraTracks]);

  useEffect(() => {
    return () => {
      stopAudioTracks();
      stopCameraTracks();
    };
  }, [stopAudioTracks, stopCameraTracks]);

  useEffect(() => {
    setDraftName(userName);
  }, [userName]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [isCameraOpen]);

  const commitNameEdit = () => {
    const cleaned = draftName.trim();
    if (cleaned.length > 0) {
      onUpdateUserName(cleaned.slice(0, 40));
    } else {
      setDraftName(userName);
    }
    setIsEditingName(false);
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('image/')) {
      setMediaNotice('Selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMediaNotice('La imagen supera el límite permitido de 10 MB.');
      return;
    }

    try {
      const dataUrl = await readBlobAsDataUrl(file);
      const base64Data = dataUrl.split(',')[1] ?? '';
      setPendingAttachment({
        kind: 'image',
        mimeType: file.type || 'image/jpeg',
        data: base64Data,
        previewUrl: dataUrl,
        name: file.name || 'recibo.jpg',
      });
    } catch {
      setMediaNotice('No se pudo cargar la imagen seleccionada.');
    }
  };

  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('audio/')) {
      setMediaNotice('Selecciona un archivo de audio válido (MP3, WAV, M4A, OGG, WEBM).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMediaNotice('El archivo de audio supera el límite permitido de 10 MB.');
      return;
    }

    try {
      const dataUrl = await readBlobAsDataUrl(file);
      const base64Data = dataUrl.split(',')[1] ?? '';
      setPendingAttachment({
        kind: 'audio',
        mimeType: file.type || 'audio/mp3',
        data: base64Data,
        previewUrl: dataUrl,
        name: file.name || 'nota-de-voz.mp3',
      });
    } catch {
      setMediaNotice('No se pudo cargar el archivo de audio seleccionado.');
    }
  };

  const openCamera = async () => {
    setMediaNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaNotice('Tu navegador no soporta captura directa de cámara. Usa "Subir imagen".');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/denied|notallowed|permission/i.test(msg)) {
        setMediaNotice(
          'Permiso de cámara denegado. Habilítalo en tu navegador o usa "Subir imagen".'
        );
      } else {
        setMediaNotice('No se pudo abrir la cámara. Intenta subir una imagen desde tu dispositivo.');
      }
    }
  };

  const capturePhotoFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1] ?? '';
    stopCameraTracks();

    setPendingAttachment({
      kind: 'image',
      mimeType: 'image/jpeg',
      data: base64Data,
      previewUrl: dataUrl,
      name: `recibo-${Date.now()}.jpg`,
    });
  };

  const stopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopAudioTracks();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    setMediaNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaNotice(
        'Tu navegador no soporta grabación de voz. Puedes cargar un archivo de audio.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      discardRecordingRef.current = false;

      const chosenMime = pickSupportedAudioMime();
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldDiscard = discardRecordingRef.current;
        const mimeType = recorder.mimeType || chosenMime || 'audio/webm';
        const chunks = [...audioChunksRef.current];
        stopAudioTracks();
        setIsRecording(false);
        setRecordingSeconds(0);

        if (shouldDiscard || chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size > MAX_FILE_BYTES) {
          setMediaNotice('La nota de voz supera el tamaño máximo de 10 MB.');
          return;
        }

        try {
          const dataUrl = await readBlobAsDataUrl(blob);
          const base64Data = dataUrl.split(',')[1] ?? '';
          const cleanMime = mimeType.split(';')[0] || 'audio/webm';
          setPendingAttachment({
            kind: 'audio',
            mimeType: cleanMime,
            data: base64Data,
            previewUrl: dataUrl,
            name: 'Nota de voz grabada',
          });
        } catch {
          setMediaNotice('No se pudo procesar el audio grabado.');
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= 120) {
            stopRecording(false);
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      stopAudioTracks();
      const msg = err instanceof Error ? err.message : '';
      if (/denied|notallowed|permission/i.test(msg)) {
        setMediaNotice(
          'Permiso de micrófono denegado. Habilítalo en tu navegador o carga un archivo de audio.'
        );
      } else {
        setMediaNotice('No se pudo acceder al micrófono. Intenta cargar un archivo de audio.');
      }
    }
  };

  const sendMessage = async (
    rawText: string,
    attachmentToSend: ChatAttachment | null = pendingAttachment
  ) => {
    const trimmed = rawText.trim();
    if ((!trimmed && !attachmentToSend) || isLoading || isRecording) return;

    setMediaNotice(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      attachment: attachmentToSend ?? undefined,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputValue('');
    setPendingAttachment(null);
    setIsLoading(true);

    try {
      const payloadMessages = nextHistory
        .filter((m) => !m.isError)
        .map((m, idx, arr) => {
          // Include attachment binary on recent turns so follow-up clarification works seamlessly
          const includeAttachment = Boolean(m.attachment && idx >= arr.length - 3);
          return {
            role: m.role,
            text: m.text,
            attachment:
              includeAttachment && m.attachment
                ? {
                    kind: m.attachment.kind,
                    mimeType: m.attachment.mimeType,
                    data: m.attachment.data,
                    name: m.attachment.name,
                  }
                : undefined,
          };
        });

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          budgetContext: {
            ...budgetContext,
            userName,
          },
        }),
      });

      let data: {
        code?: number;
        error?: string;
        reply?: string;
        functionCalls?: Array<{
          name: string;
          args: RegisteredExpensePayload;
        }>;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const statusCode = data.code ?? response.status;
        let friendlyError: string;

        if (statusCode === 503) {
          friendlyError =
            'El asistente está muy solicitado en este momento. Por favor, intenta de nuevo en un minuto.';
        } else if (statusCode === 429) {
          friendlyError =
            'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
        } else {
          friendlyError =
            data.error ||
            `Error del servidor (${response.status}): no fue posible procesar la solicitud.`;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: friendlyError,
            isError: true,
          },
        ]);
        return;
      }

      const registeredExpenses: RegisteredExpensePayload[] = [];
      if (Array.isArray(data.functionCalls)) {
        for (const call of data.functionCalls) {
          if (call.name === 'registerExpense' && call.args) {
            onRegisterExpense(call.args);
            registeredExpenses.push(call.args);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.reply || 'He procesado tu solicitud correctamente.',
          registeredExpenses:
            registeredExpenses.length > 0 ? registeredExpenses : undefined,
        },
      ]);
    } catch (err) {
      const technicalMessage =
        err instanceof Error
          ? err.message
          : 'Error de conexión con el servidor.';
      setMessages((prev) => [
        ...prev,
        {
          id: `net-err-${Date.now()}`,
          role: 'assistant',
          text: technicalMessage,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue, pendingAttachment);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-drawer-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Slide-Over Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[#F7F8F9] dark:bg-[#0F172A] h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full bg-[#5B3DF5] text-white flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <Bot className="w-[18px] h-[18px]" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="assistant-drawer-title"
                    className="font-[family-name:var(--font-display)] text-base font-bold text-slate-900 dark:text-slate-100 truncate"
                  >
                    Asistente de presupuesto
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="tabular-nums truncate">
                      Disponible: {formatCOP(budgetContext.availableBalance)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    {isEditingName ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={commitNameEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitNameEdit();
                            } else if (e.key === 'Escape') {
                              setDraftName(userName);
                              setIsEditingName(false);
                            }
                          }}
                          autoFocus
                          aria-label="Editar tu nombre"
                          className="w-24 px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-[#5B3DF5]/50 rounded focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={commitNameEdit}
                          aria-label="Guardar nombre"
                          className="text-[#146C43] dark:text-emerald-400 hover:text-[#0F5132] dark:hover:text-emerald-300 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        title="Cambiar tu nombre"
                        className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-[#5B3DF5] dark:hover:text-[#9D8BFF] cursor-pointer"
                      >
                        <span className="font-medium">{userName}</span>
                        <Pencil className="w-3 h-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#5B3DF5] text-white rounded-br-sm'
                          : msg.isError
                          ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 rounded-bl-sm'
                          : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-2xs'
                      }`}
                    >
                      {msg.isError && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Aviso del asistente</span>
                        </div>
                      )}

                      {msg.attachment?.kind === 'image' && (
                        <div className="mb-2">
                          <img
                            src={msg.attachment.previewUrl}
                            alt={msg.attachment.name || 'Imagen adjunta de gasto'}
                            className="max-h-48 w-auto rounded-xl object-contain bg-black/10"
                          />
                        </div>
                      )}

                      {msg.attachment?.kind === 'audio' && (
                        <div className="mb-2">
                          <audio
                            controls
                            src={msg.attachment.previewUrl}
                            className="w-full max-w-[240px] h-9"
                          />
                        </div>
                      )}

                      {msg.text && (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}

                      {/* Visual Confirmation for Executed Function Calls */}
                      {msg.registeredExpenses &&
                        msg.registeredExpenses.map((exp, idx) => (
                          <div
                            key={`${msg.id}-exp-${idx}`}
                            className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-emerald-900/40 flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 rounded-xl p-2.5"
                          >
                            <CheckCircle2
                              className="w-4 h-4 text-[#146C43] dark:text-emerald-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#146C43] dark:text-emerald-400">
                                Gasto registrado en el dashboard
                              </p>
                              <p className="mt-0.5 text-slate-700 dark:text-slate-200 tabular-nums">
                                {exp.description} · {exp.category} ·{' '}
                                <strong>{formatCOP(exp.amount)}</strong>
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator ('escribiendo...') */}
              {isLoading && (
                <div className="flex items-start" role="status" aria-live="polite">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-2xs flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      escribiendo
                    </span>
                    <span className="inline-flex items-center gap-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-bounce" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer: Camera Preview / Pending Attachment / Controls / Input */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              {/* Inline Camera Capture Viewfinder */}
              {isCameraOpen && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950 overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-48 object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900">
                    <button
                      type="button"
                      onClick={stopCameraTracks}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={capturePhotoFromCamera}
                      className="px-4 py-1.5 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Capturar recibo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Media Permission or File Validation Notice */}
              {mediaNotice && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200"
                >
                  <span>{mediaNotice}</span>
                  <button
                    type="button"
                    onClick={() => setMediaNotice(null)}
                    aria-label="Cerrar aviso"
                    className="text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Live Audio Recording Bar */}
              {isRecording && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-200 tabular-nums">
                      Grabando nota de voz · {formatDuration(recordingSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                      <span>Detener</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Image or Audio Preview */}
              {pendingAttachment && !isRecording && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-[#F7F8F9] dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700">
                  {pendingAttachment.kind === 'image' ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={pendingAttachment.previewUrl}
                        alt="Vista previa del recibo"
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {pendingAttachment.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Imagen lista para analizar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <audio
                        controls
                        src={pendingAttachment.previewUrl}
                        className="w-full h-8"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Quitar archivo adjunto"
                    className="w-7 h-7 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    disabled={isLoading || isRecording}
                    onClick={() => void sendMessage(promptText, null)}
                    className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Hidden Multimodal File Inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                aria-hidden="true"
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
                aria-hidden="true"
              />

              {/* Multimodal Toolbar + Composer */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={() => imageInputRef.current?.click()}
                  title="Subir imagen de recibo o ticket"
                  aria-label="Subir imagen de recibo o ticket"
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-[#F7F8F9] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#5B3DF5] dark:hover:text-[#9D8BFF] flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={() => void openCamera()}
                  title="Tomar foto del recibo con cámara"
                  aria-label="Tomar foto del recibo con cámara"
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-[#F7F8F9] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#5B3DF5] dark:hover:text-[#9D8BFF] flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    isRecording ? stopRecording(false) : void startRecording()
                  }
                  title={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                  aria-label={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                    isRecording
                      ? 'border-rose-300 dark:border-rose-700 bg-rose-600 text-white hover:bg-rose-700'
                      : 'border-slate-200 dark:border-slate-700 bg-[#F7F8F9] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#146C43] dark:hover:text-emerald-400'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={() => audioInputRef.current?.click()}
                  title="Cargar nota de voz o archivo de audio"
                  aria-label="Cargar nota de voz o archivo de audio"
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-[#F7F8F9] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#146C43] dark:hover:text-emerald-400 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <AudioLines className="w-4 h-4" />
                </button>

                <form
                  onSubmit={handleSubmit}
                  className="flex-1 flex items-center gap-1.5 min-w-0"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading || isRecording}
                    placeholder={
                      pendingAttachment
                        ? 'Añade una nota (opcional)...'
                        : 'Escribe, sube recibo o graba...'
                    }
                    aria-label="Escribe un gasto o pregunta sobre tu presupuesto"
                    className="flex-1 min-w-0 rounded-full border border-slate-200 dark:border-slate-700 bg-[#F7F8F9] dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-2 focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      isRecording ||
                      (inputValue.trim().length === 0 && !pendingAttachment)
                    }
                    aria-label="Enviar mensaje"
                    className="w-9 h-9 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
