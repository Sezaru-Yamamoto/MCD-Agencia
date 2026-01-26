'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'predefined' | 'ai' | 'error_fallback';
  whatsappLinks?: {
    acapulco: string;
    tecoanapa: string;
  };
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

// API Base URL - usar variable de entorno o localhost en desarrollo
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Detectar locale del pathname
function getLocaleFromPath(): string {
  if (typeof window === 'undefined') return 'es';
  const path = window.location.pathname;
  if (path.startsWith('/en')) return 'en';
  return 'es';
}

export default function ChatWidget() {
  const [locale, setLocale] = useState('es');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Traducciones inline
  const t = {
    es: {
      title: 'Chat de Ayuda',
      placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      typing: 'Escribiendo...',
      whatsappTitle: 'Continuar por WhatsApp',
      whatsappAcapulco: 'WhatsApp Acapulco',
      whatsappTecoanapa: 'WhatsApp Tecoanapa',
      close: 'Cerrar',
      poweredBy: 'Asistente MCD',
      welcomeDefault: '¡Hola! 👋 Soy el asistente virtual de Agencia MCD. ¿En qué puedo ayudarte?'
    },
    en: {
      title: 'Help Chat',
      placeholder: 'Type your message...',
      send: 'Send',
      typing: 'Typing...',
      whatsappTitle: 'Continue on WhatsApp',
      whatsappAcapulco: 'WhatsApp Acapulco',
      whatsappTecoanapa: 'WhatsApp Tecoanapa',
      close: 'Close',
      poweredBy: 'MCD Assistant',
      welcomeDefault: 'Hello! 👋 I\'m the virtual assistant of Agencia MCD. How can I help you?'
    }
  };

  const texts = t[locale as keyof typeof t] || t.es;

  // Detectar locale al montar
  useEffect(() => {
    setLocale(getLocaleFromPath());
  }, []);

  // Cargar configuración al montar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/chatbot/web-chat/config/?language=${locale}`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('Error loading chat config:', error);
        // Usar configuración por defecto
        setConfig({
          name: 'Agencia MCD Bot',
          welcome_message: texts.welcomeDefault,
          is_active: true,
          quick_actions: [
            { id: 'services', label: locale === 'es' ? 'Servicios' : 'Services', message: locale === 'es' ? 'Quiero conocer los servicios' : 'I want to know about services' },
            { id: 'quote', label: locale === 'es' ? 'Cotización' : 'Quote', message: locale === 'es' ? 'Quiero solicitar una cotización' : 'I want to request a quote' },
            { id: 'location', label: locale === 'es' ? 'Ubicación' : 'Location', message: locale === 'es' ? 'Dónde están ubicados' : 'Where are you located' },
          ]
        });
      }
    };
    loadConfig();
  }, [locale, texts.welcomeDefault]);

  // Agregar mensaje de bienvenida cuando se abre el chat
  useEffect(() => {
    if (isOpen && messages.length === 0 && config) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: config.welcome_message,
        timestamp: new Date(),
        source: 'predefined'
      }]);
    }
  }, [isOpen, config, messages.length]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowWhatsAppOptions(false);

    try {
      // Preparar historial para contexto
      const history = messages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch(`${API_BASE_URL}/api/v1/chatbot/web-chat/message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          session_id: sessionId,
          language: locale,
          history: history
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          source: data.source,
          whatsappLinks: data.whatsapp_links
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Si debe escalar a WhatsApp, mostrar opciones
        if (data.should_escalate) {
          setShowWhatsAppOptions(true);
        }
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Respuesta de fallback offline
      const fallbackMessage: Message = {
        id: `fallback_${Date.now()}`,
        role: 'assistant',
        content: locale === 'es' 
          ? '¡Gracias por tu mensaje! Por el momento no puedo conectarme. Te invito a contactarnos por WhatsApp para una atención inmediata.'
          : 'Thanks for your message! I\'m currently unable to connect. Please contact us via WhatsApp for immediate assistance.',
        timestamp: new Date(),
        source: 'error_fallback',
        whatsappLinks: {
          acapulco: 'https://wa.me/527446887382',
          tecoanapa: 'https://wa.me/527451147727'
        }
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setShowWhatsAppOptions(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.message);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 bg-cyan-500 hover:bg-cyan-600 rounded-full shadow-2xl transform hover:scale-110 transition-all duration-300 ${isOpen ? 'hidden' : 'flex'} items-center justify-center group`}
        aria-label="Abrir chat"
      >
        <img 
          src="/images/chatbot-mascot.png" 
          alt="Chat" 
          className="w-10 h-10 object-contain"
        />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-100px)] bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                <img src="/images/chatbot-mascot.png" alt="Bot" className="w-11 h-11 object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-sm">{texts.title}</h3>
                <p className="text-xs text-white/80">{texts.poweredBy}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label={texts.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    message.role === 'user' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-600'
                  }`}>
                    {message.role === 'user' ? <User className="w-5 h-5" /> : <img src="/images/chatbot-mascot.png" alt="Bot" className="w-8 h-8 object-contain" />}
                  </div>
                  
                  {/* Message bubble */}
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-sm'
                      : 'bg-gray-700 text-gray-100 shadow-sm rounded-bl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                    <img src="/images/chatbot-mascot.png" alt="Bot" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="bg-gray-700 rounded-2xl px-4 py-3 shadow-sm rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Options */}
            {showWhatsAppOptions && messages.length > 0 && (
              <div className="bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-600">
                <p className="text-sm font-medium text-gray-100 mb-3">{texts.whatsappTitle}</p>
                <div className="flex flex-col gap-2">
                  <a
                    href={messages[messages.length - 1]?.whatsappLinks?.acapulco || 'https://wa.me/527446887382'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {texts.whatsappAcapulco}
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </a>
                  <a
                    href={messages[messages.length - 1]?.whatsappLinks?.tecoanapa || 'https://wa.me/527451147727'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {texts.whatsappTecoanapa}
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </a>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - only show if no messages yet besides welcome */}
          {messages.length <= 1 && config?.quick_actions && (
            <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
              <div className="flex flex-wrap gap-2">
                {config.quick_actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-xs text-gray-200 hover:bg-gray-600 hover:border-primary-400 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-gray-900 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={texts.placeholder}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-gray-600 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={texts.send}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
