import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

interface AiPanelProps {
  open: boolean;
  onClose: () => void;
  context?: Record<string, any>;
}

export const AiPanel = ({ open, onClose, context = {} }: AiPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: 'Olá! Sou o analista virtual do Lab. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<'claude' | 'deepseek' | 'qwen'>('claude');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { id: Date.now(), sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    if (model !== 'claude') {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Em breve' }]);
      setStreaming(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          context,
          model: 'claude-sonnet-4-20250514'
        })
      });

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'ai', text: 'Erro na comunicação com a IA.' }]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      let aiId = Date.now() + 2;
      setMessages(prev => [...prev, { id: aiId, sender: 'ai', text: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                aiText += data.text;
                setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: aiText } : m));
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 3, sender: 'ai', text: 'Erro ao processar resposta.' }]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, model, context, streaming]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 420 }}
          animate={{ x: 0 }}
          exit={{ x: 420 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-[var(--header-height)] right-0 bottom-0 w-[420px] bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-2xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[var(--accent-primary)]" />
              <span className="font-medium text-sm text-[var(--text-primary)]">AI Analyst</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={model}
                onChange={e => setModel(e.target.value as any)}
                className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-secondary)] outline-none"
              >
                <option value="claude">Claude API</option>
                <option value="deepseek">DeepSeek Local</option>
                <option value="qwen">Qwen Local</option>
              </select>
              <button onClick={onClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors">
                <X size={16} className="text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-[var(--accent-primary)] text-white rounded-br-none'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border-subtle)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)]">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.ctrlKey && e.key === 'Enter') handleSend();
                }}
                placeholder="Pergunte sobre o fundo..."
                rows={2}
                className="flex-1 resize-none bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="self-end p-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
