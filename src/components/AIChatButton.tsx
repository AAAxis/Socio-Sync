import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AIChatBox } from './AIChatBox';
import './AIChatBox.css';

interface AIChatButtonProps {
  caseId?: string; // Optional: for patient-specific context
}

export function AIChatButton({ caseId }: AIChatButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        className="ai-chatbox-floating-button"
        onClick={() => setIsOpen(true)}
        aria-label={t('chat.openChat', 'Open AI Assistant')}
        title={t('chat.openChat', 'Open AI Assistant')}
      >
        🤖
      </button>
    );
  }

  return (
    <>
      <div className="ai-chatbox-floating-window">
        <AIChatBox caseId={caseId} onClose={() => setIsOpen(false)} />
      </div>
    </>
  );
}

