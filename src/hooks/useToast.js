import { useState, useCallback } from 'react';

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const show = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const showSuccess = useCallback((message) => show(message, 'success'), [show]);
    const showError = useCallback((message) => show(message, 'error'), [show]);
    const showInfo = useCallback((message) => show(message, 'info'), [show]);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, show, showSuccess, showError, showInfo, dismiss };
};
