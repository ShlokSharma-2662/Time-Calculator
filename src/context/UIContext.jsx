import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

    // Toast Methods
    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const showSuccess = useCallback((msg) => showToast(msg, 'success'), [showToast]);
    const showError = useCallback((msg) => showToast(msg, 'error'), [showToast]);
    const showInfo = useCallback((msg) => showToast(msg, 'info'), [showToast]);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Confirmation Methods
    const confirm = useCallback(({ title, message, onConfirm, type = 'warning' }) => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            },
            type
        });
    }, []);

    const closeConfirm = useCallback(() => setConfirmDialog(prev => ({ ...prev, isOpen: false })), []);

    return (
        <UIContext.Provider value={{ 
            toasts, showSuccess, showError, showInfo, dismissToast,
            confirm, confirmDialog, closeConfirm 
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within UIProvider');
    return context;
};
