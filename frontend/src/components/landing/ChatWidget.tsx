'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, User, ExternalLink, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string;          // backend UUID for feedback
  source?: 'predefined' | 'ai' | 'fallback' | 'error_fallback';
  suggestions?: string[];
  feedbackGiven?: 'positive' | 'negative' | null;
  whatsappLinks?: { acapulco: string; tecoanapa: string };
}

interface QuickAction {
  id: string;
  label: string;
  message: string;
}

interface ChatConfig {
  name: string;
  welcome_message: string;
  is_active: boolean;
  quick_actions: QuickAction[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const STORAGE_KEY = 'mcd_chat_state';
const MAX_MESSAGE_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLocaleFromPath(): string {
  if (typeof window === 'undefined') return 'es';
  return window.location.pathname.startsWith('/en') ? 'en' : 'es';
}

/** Convert plain-text URLs into clickable <a> elements. */
function renderContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s,)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-cyan-400 hover:text-cyan-300 break-all"
      >
        {part.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').substring(0, 40)}
        {part.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').length > 40 ? '…' : ''}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Save chat state to localStorage. */
function saveState(sessionId: string, messages: Message[]) {
  try {
    const payload = {
      sessionId,
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* quota exceeded — ignore */ }
}

/** Restore chat state from localStorage (max 24h old). */
function loadState(): { sessionId: string; messages: Message[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - new Date(data.savedAt).getTime() > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      sessionId: data.sessionId,
      messages: data.messages.map((m: Message & { timestamp: string }) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    };
  } catch {
    return null;
  }
}

interface ChatWidgetProps {
  /** When provided, controls open state externally */
  externalOpen?: boolean;
  /** Callback when open state changes (for external control) */
  onOpenChange?: (open: boolean) => void;
  /** Callback for the full chat UI state so other floating elements can reposition */
  onStateChange?: (state: { open: boolean; minimized: boolean }) => void;
}

export default function ChatWidget({ externalOpen, onOpenChange, onStateChange }: ChatWidgetProps = {}) {
  const [locale, setLocale] = useState('es');
  const [internalOpen, setInternalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Use external control when props are provided
  const isExternallyControlled = externalOpen !== undefined;
  const isOpen = isExternallyControlled ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (isExternallyControlled && onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    onStateChange?.({ open: isOpen, minimized: isMinimized });
  }, [isOpen, isMinimized, onStateChange]);

  useEffect(() => {
    if (!isOpen && isMinimized) {
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized]);

  // ---- Translations ----
  const t = {
    es: {
      title: 'Chat de Ayuda',
      placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      whatsappTitle: 'Continuar por WhatsApp',
      whatsappAcapulco: 'WhatsApp Acapulco',
      whatsappTecoanapa: 'WhatsApp Tecoanapa',
      close: 'Cerrar',
      minimize: 'Minimizar',
      poweredBy: 'Asistente IA · MCD',
      welcomeDefault: '¡Hola! 👋 Soy el asistente virtual de Agencia MCD. ¿En qué puedo ayudarte?',
      charCount: (n: number) => `${n}/${MAX_MESSAGE_LENGTH}`,
      feedbackThanks: '¡Gracias por tu opinión!',
      newChat: 'Nueva conversación',
    },
    en: {
      title: 'Help Chat',
      placeholder: 'Type your message...',
      send: 'Send',
      whatsappTitle: 'Continue on WhatsApp',
      whatsappAcapulco: 'WhatsApp Acapulco',
      whatsappTecoanapa: 'WhatsApp Tecoanapa',
      close: 'Close',
      minimize: 'Minimize',
      poweredBy: 'AI Assistant · MCD',
      welcomeDefault: "Hello! 👋 I'm the virtual assistant of Agencia MCD. How can I help you?",
      charCount: (n: number) => `${n}/${MAX_MESSAGE_LENGTH}`,
      feedbackThanks: 'Thanks for your feedback!',
      newChat: 'New conversation',
    },
  };
  const texts = t[locale as keyof typeof t] || t.es;

  // ---- Initialize: locale + restore from localStorage ----
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const detectedLocale = getLocaleFromPath();
    setLocale(detectedLocale);
    const saved = loadState();
    if (saved) {
      setSessionId(saved.sessionId);
      setMessages(saved.messages);
    } else {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  // ---- Load config ----
  useEffect(() => {
    if (!locale) return;
    const loadConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chatbot/web-chat/config/?language=${locale}`);
        if (res.ok) { setConfig(await res.json()); return; }
      } catch { /* ignore */ }
      setConfig({
        name: 'Agencia MCD Bot',
        welcome_message: texts.welcomeDefault,
        is_active: true,
        quick_actions: [
          { id: 'services', label: locale === 'es' ? '🎨 Servicios' : '🎨 Services', message: locale === 'es' ? '¿Qué servicios ofrecen?' : 'What services do you offer?' },
          { id: 'quote', label: locale === 'es' ? '📋 Cotizar' : '📋 Quote', message: locale === 'es' ? 'Quiero solicitar una cotización' : 'I want to request a quote' },
          { id: 'location', label: locale === 'es' ? '📍 Ubicación' : '📍 Location', message: locale === 'es' ? '¿Dónde están ubicados?' : 'Where are you located?' },
          { id: 'faq_delivery', label: locale === 'es' ? '🚚 Entregas' : '🚚 Delivery', message: locale === 'es' ? '¿Cuáles son los tiempos de entrega?' : 'What are the delivery times?' },
          { id: 'faq_payment', label: locale === 'es' ? '💳 Pagos' : '💳 Payment', message: locale === 'es' ? '¿Qué métodos de pago aceptan?' : 'What payment methods do you accept?' },
          { id: 'faq_formats', label: locale === 'es' ? '📐 Formatos' : '📐 Formats', message: locale === 'es' ? '¿Qué formatos de archivo aceptan?' : 'What file formats do you accept?' },
          { id: 'faq_warranty', label: locale === 'es' ? '🛡️ Garantía' : '🛡️ Warranty', message: locale === 'es' ? '¿Ofrecen garantía en sus productos?' : 'Do you offer warranty on products?' },
          { id: 'faq_hours', label: locale === 'es' ? '🕐 Horarios' : '🕐 Hours', message: locale === 'es' ? '¿Cuál es su horario de atención?' : 'What are your business hours?' },
        ],
      });
    };
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // ---- Welcome message when opened with no history ----
  useEffect(() => {
    if (isOpen && messages.length === 0 && config) {
      setMessages([{
        id: 'welcome', role: 'assistant', content: config.welcome_message,
        timestamp: new Date(), source: 'predefined',
      }]);
    }
  }, [isOpen, config, messages.length]);

  // ---- Persist to localStorage on message change ----
  useEffect(() => {
    if (sessionId && messages.length > 0) saveState(sessionId, messages);
  }, [messages, sessionId]);

  // ---- Scroll to bottom ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ---- Focus input ----
  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen, isMinimized]);

  // ---- Send message ----
  const sendMessage = useCallback(async (messageText: string) => {
    const trimmed = messageText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed || isLoading) return;

    setMessages(prev => [...prev, {
      id: `user_${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date(),
    }]);
    setInputValue('');
    setIsLoading(true);
    setShowWhatsAppOptions(false);

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content,
      }));

      const res = await fetch(`${API_BASE_URL}/chatbot/web-chat/message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, session_id: sessionId, language: locale, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: `assistant_${Date.now()}`, role: 'assistant', content: data.message,
        messageId: data.message_id, timestamp: new Date(), source: data.source,
        suggestions: data.suggestions || [], feedbackGiven: null,
        whatsappLinks: data.whatsapp_links,
      }]);
      if (data.should_escalate) setShowWhatsAppOptions(true);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: `fallback_${Date.now()}`, role: 'assistant',
        content: locale === 'es'
          ? '¡Gracias por tu mensaje! Por el momento no puedo conectarme. Te invito a contactarnos por WhatsApp para una atención inmediata.'
          : "Thanks for your message! I'm currently unable to connect. Please contact us via WhatsApp for immediate assistance.",
        timestamp: new Date(), source: 'error_fallback',
        whatsappLinks: { acapulco: 'https://wa.me/527446887382', tecoanapa: 'https://wa.me/527451147727' },
      }]);
      setShowWhatsAppOptions(true);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, sessionId, locale]);

  // ---- Feedback handler ----
  const handleFeedback = useCallback(async (msgIndex: number, rating: 'positive' | 'negative') => {
    const msg = messages[msgIndex];
    if (!msg?.messageId || msg.feedbackGiven) return;
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedbackGiven: rating } : m));
    try {
      await fetch(`${API_BASE_URL}/chatbot/web-chat/feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: msg.messageId, rating, session_id: sessionId }),
      });
    } catch {
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedbackGiven: null } : m));
    }
  }, [messages, sessionId]);

  // ---- New conversation ----
  const handleNewChat = useCallback(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setMessages([]); setShowWhatsAppOptions(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(inputValue); };
  const handleQuickAction = (action: QuickAction) => sendMessage(action.message);
  const handleSuggestion = (s: string) => sendMessage(s);
  const formatTime = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.suggestions && m.suggestions.length > 0);
  const showSuggestions = !isLoading && lastBotMsg && messages.length > 1;

  return (
    <>
      {/* Chat Button — only shown when NOT externally controlled */}
      {!isExternallyControlled && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className={`fixed bottom-24 right-6 z-40 w-14 h-14 bg-cmyk-cyan hover:bg-cmyk-cyan rounded-full shadow-2xl transform hover:scale-110 transition-all duration-300 ${isOpen ? 'hidden' : 'flex'} items-center justify-center`}
          aria-label="Abrir chat"
        >
          <ChatBubbleLeftRightIcon className="w-10 h-10 text-white" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white" />
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-[58] w-[380px] max-w-[calc(100vw-48px)] bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 ${isMinimized ? 'h-auto' : 'h-[550px] max-h-[calc(100vh-100px)]'}`}>

          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                <ChatBubbleLeftRightIcon className="w-9 h-9 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{texts.title}</h3>
                <p className="text-[11px] text-white/80">{texts.poweredBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button onClick={handleNewChat} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label={texts.newChat} title={texts.newChat}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label={texts.minimize}>
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsMinimized(false); setIsOpen(false); }} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label={texts.close}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
                {messages.map((message, index) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${message.role === 'user' ? 'bg-cmyk-cyan text-white' : 'bg-gray-600'}`}>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className={`rounded-2xl px-4 py-2.5 ${message.role === 'user' ? 'bg-cmyk-cyan text-white rounded-br-sm' : 'bg-gray-700 text-gray-100 shadow-sm rounded-bl-sm'}`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.role === 'assistant' ? renderContent(message.content) : message.content}
                          </p>
                          <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-white/60' : 'text-gray-500'}`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                        {/* Feedback */}
                        {message.role === 'assistant' && message.messageId && message.source === 'ai' && (
                          <div className="flex items-center gap-1 ml-1">
                            {message.feedbackGiven ? (
                              <span className="text-[10px] text-gray-500">{texts.feedbackThanks}</span>
                            ) : (
                              <>
                                <button onClick={() => handleFeedback(index, 'positive')} className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-green-400 transition-colors" aria-label="Good response">
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleFeedback(index, 'negative')} className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors" aria-label="Bad response">
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
                      </div>
                      <div className="bg-gray-700 rounded-2xl px-4 py-3 shadow-sm rounded-bl-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp escalation */}
                {showWhatsAppOptions && messages.length > 0 && (
                  <div className="bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-600">
                    <p className="text-sm font-medium text-gray-100 mb-3">{texts.whatsappTitle}</p>
                    <div className="flex flex-col gap-2">
                      {(['acapulco', 'tecoanapa'] as const).map(branch => (
                        <a key={branch} href={messages[messages.length - 1]?.whatsappLinks?.[branch] || `https://wa.me/${branch === 'acapulco' ? '527446887382' : '527451147727'}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          {branch === 'acapulco' ? texts.whatsappAcapulco : texts.whatsappTecoanapa}
                          <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Chips (after each AI response) */}
              {showSuggestions && lastBotMsg && (
                <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {lastBotMsg.suggestions!.map((s, i) => (
                      <button key={i} onClick={() => handleSuggestion(s)} className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-xs text-gray-200 hover:bg-gray-600 hover:border-primary-400 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions — only at start */}
              {messages.length <= 1 && config?.quick_actions && !showSuggestions && (
                <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {config.quick_actions.map((action) => (
                      <button key={action.id} onClick={() => handleQuickAction(action)} className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-xs text-gray-200 hover:bg-gray-600 hover:border-primary-400 transition-colors">
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 bg-gray-900 border-t border-gray-700 flex-shrink-0">
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    placeholder={texts.placeholder}
                    maxLength={MAX_MESSAGE_LENGTH}
                    className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-gray-600 transition-all"
                    disabled={isLoading}
                  />
                  <button type="submit" disabled={!inputValue.trim() || isLoading} className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label={texts.send}>
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                {inputValue.length > MAX_MESSAGE_LENGTH * 0.8 && (
                  <p className={`text-[10px] mt-1 text-right ${inputValue.length >= MAX_MESSAGE_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
                    {texts.charCount(inputValue.length)}
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
