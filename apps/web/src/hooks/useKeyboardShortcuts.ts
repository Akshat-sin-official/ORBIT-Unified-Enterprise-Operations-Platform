import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
  onToggleCommandPalette?: () => void;
  onToggleCopilot?: () => void;
  onToggleShortcuts?: () => void;
  onEscape?: () => void;
  onNewTicket?: () => void;
  onNewWorkOrder?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate();
  const sequencePrefix = useRef<string | null>(null);
  const sequenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      // 1. Global hotkeys that work even inside inputs:
      // Ctrl+K / Cmd+K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.onToggleCommandPalette?.();
        return;
      }

      // Ctrl+J / Cmd+J -> Copilot
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        handlers.onToggleCopilot?.();
        return;
      }

      // Escape -> Close dialogs / clear selections
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // 2. Hotkeys that should NOT trigger when typing in inputs:
      if (isInput) return;

      const key = e.key.toLowerCase();

      // ? -> Shortcuts guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        handlers.onToggleShortcuts?.();
        return;
      }

      // Handle sequence prefix (G or N)
      if (sequencePrefix.current === 'g') {
        sequencePrefix.current = null;
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);

        switch (key) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            return;
          case 't':
            e.preventDefault();
            navigate('/operations/tickets');
            return;
          case 'w':
            e.preventDefault();
            navigate('/operations/work-orders');
            return;
          case 'i':
            e.preventDefault();
            navigate('/management/inventory');
            return;
          case 'l':
            e.preventDefault();
            navigate('/management/logistics');
            return;
          case 'f':
            e.preventDefault();
            navigate('/management/finance');
            return;
          case 'a':
            e.preventDefault();
            navigate('/management/analytics');
            return;
          case 'c':
            e.preventDefault();
            navigate('/operations/customers');
            return;
          case 's':
            e.preventDefault();
            navigate('/settings/organization');
            return;
          case 'u':
            e.preventDefault();
            navigate('/settings/users');
            return;
          default:
            break;
        }
      }

      if (sequencePrefix.current === 'n') {
        sequencePrefix.current = null;
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);

        if (key === 't') {
          e.preventDefault();
          if (handlers.onNewTicket) handlers.onNewTicket();
          else navigate('/operations/tickets?create=true');
          return;
        }
        if (key === 'w') {
          e.preventDefault();
          if (handlers.onNewWorkOrder) handlers.onNewWorkOrder();
          else navigate('/operations/work-orders?create=true');
          return;
        }
      }

      // Initiate sequence prefix
      if (key === 'g' || key === 'n') {
        sequencePrefix.current = key;
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
        sequenceTimer.current = setTimeout(() => {
          sequencePrefix.current = null;
        }, 1200); // 1.2 second sequence buffer
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
    };
  }, [navigate, handlers]);
}
