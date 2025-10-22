import React from 'react';
import { useTranslation } from 'react-i18next';

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message: string;
  type: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export function CustomDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  confirmText,
  cancelText
}: CustomDialogProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && type === 'alert') {
      onClose();
    }
  };

  const isRTL = i18n.language === 'he';

  return (
    <div className="custom-dialog-overlay" onClick={onClose}>
      <div 
        className={`custom-dialog ${isRTL ? 'rtl' : 'ltr'}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="custom-dialog-header">
          <h3 className="custom-dialog-title">
            {title || (type === 'confirm' ? t('dialog.confirm') : t('dialog.alert'))}
          </h3>
          <button 
            className="custom-dialog-close"
            onClick={onClose}
            aria-label={t('dialog.close')}
          >
            ×
          </button>
        </div>
        
        <div className="custom-dialog-body">
          <p className="custom-dialog-message">{message}</p>
        </div>
        
        <div className="custom-dialog-footer">
          {type === 'confirm' ? (
            <>
              <button 
                className="custom-dialog-button custom-dialog-button-cancel"
                onClick={handleCancel}
              >
                {cancelText || t('dialog.cancel')}
              </button>
              <button 
                className="custom-dialog-button custom-dialog-button-confirm"
                onClick={handleConfirm}
              >
                {confirmText || t('dialog.confirm')}
              </button>
            </>
          ) : (
            <button 
              className="custom-dialog-button custom-dialog-button-ok"
              onClick={onClose}
            >
              {confirmText || t('dialog.ok')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for easy dialog management
export function useCustomDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title?: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    type: 'alert',
    message: ''
  });

  const showAlert = (message: string, title?: string, confirmText?: string) => {
    setDialogState({
      isOpen: true,
      type: 'alert',
      message,
      title,
      confirmText
    });
  };

  const showConfirm = (
    message: string, 
    onConfirm: () => void, 
    title?: string, 
    confirmText?: string, 
    cancelText?: string
  ) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      message,
      title,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const DialogComponent = () => (
    <CustomDialog
      isOpen={dialogState.isOpen}
      onClose={closeDialog}
      onConfirm={dialogState.onConfirm}
      title={dialogState.title}
      message={dialogState.message}
      type={dialogState.type}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
    />
  );

  return {
    showAlert,
    showConfirm,
    closeDialog,
    DialogComponent
  };
}
