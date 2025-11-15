import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiUrl } from '../config';
import './AIChatBox.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatBoxProps {
  caseId?: string; // Optional: for patient-specific context
  onClose?: () => void;
}

export function AIChatBox({ caseId, onClose }: AIChatBoxProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: i18n.language === 'he' 
        ? 'שלום! אני כאן כדי לעזור. איך אוכל לסייע לך היום?'
        : 'Hello! I\'m here to help. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const language = i18n.language === 'he' ? 'he' : 'en';
      const context = caseId ? { caseId } : {};

      const apiUrl = getApiUrl('/api/ai/chat');
      console.log('Sending request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.text,
          language,
          context
        }),
      }).catch((fetchError) => {
        console.error('Fetch error details:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Please check if the server is accessible.`);
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('API error response:', response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || (i18n.language === 'he' 
          ? 'מצטער, לא הצלחתי לקבל תשובה. נסה שוב.'
          : 'Sorry, I couldn\'t get a response. Please try again.'),
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorText = error?.message || 'Unknown error';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: i18n.language === 'he'
          ? `אירעה שגיאה: ${errorText}. אנא נסה שוב מאוחר יותר.`
          : `An error occurred: ${errorText}. Please try again later.`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ai-chatbox-container">
      <div className="ai-chatbox-header">
        <div className="ai-chatbox-title">
          <span className="ai-chatbox-icon">🤖</span>
          <span>{t('chat.title', 'AI Assistant')}</span>
          {caseId && (
            <span className="ai-chatbox-context">
              {t('chat.patientContext', 'Patient Context')}: {caseId}
            </span>
          )}
        </div>
        {onClose && (
          <button 
            className="ai-chatbox-close" 
            onClick={onClose}
            aria-label={t('chat.close', 'Close')}
          >
            ×
          </button>
        )}
      </div>

      <div className="ai-chatbox-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-chatbox-message ai-chatbox-message-${message.sender}`}
          >
            <div className="ai-chatbox-message-content">
              <div className="ai-chatbox-message-text">{message.text}</div>
              <div className="ai-chatbox-message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-chatbox-message ai-chatbox-message-ai">
            <div className="ai-chatbox-message-content">
              <div className="ai-chatbox-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chatbox-input-container">
        <textarea
          ref={inputRef}
          className="ai-chatbox-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('chat.placeholder', 'Type your question...')}
          rows={1}
          disabled={isLoading}
          dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
        />
        <button
          className="ai-chatbox-send"
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          aria-label={t('chat.send', 'Send')}
        >
          {isLoading ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}

