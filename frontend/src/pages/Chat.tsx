import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { MessageSquare, Send, Bot, Loader2, Zap } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.chat.sendMessage(userMessage, sessionId);
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '**Error**: Unable to reach ERTAIS Intelligence mapping.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto top-6 relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Bot size={24} className="text-blue-400" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-white">Interactive Knowledge Intelligence</h2>
             <p className="text-xs text-gray-400">Powered by OpenAI GPT-4o Function Binding</p>
           </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
          <Zap size={14} /> Linked to Live Postgres DB
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <MessageSquare size={48} className="text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-200 mb-2">How can I assist you?</h3>
            <p className="text-sm text-gray-500 mb-6">Ask ERTAIS to query anomalous databases, explain forecasting traces, or summarize root cause metrics natively mapped to the telemetry UI.</p>
            <div className="flex flex-wrap gap-2 justify-center">
               <button onClick={() => setInput('What are the most recent severe anomalies?')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-gray-300 transition-colors">"Recent severe anomalies?"</button>
               <button onClick={() => setInput('Can you summarize the future risk predictions?')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-gray-300 transition-colors">"Summarize future risk"</button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-4 w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
             {msg.role === 'assistant' && (
               <div className="w-8 h-8 rounded shrink-0 bg-blue-600 flex items-center justify-center border border-blue-500"><Bot size={16} className="text-white"/></div>
             )}
             <div className={clsx('max-w-[75%] rounded-2xl px-5 py-3 text-sm shadow-md', 
               msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
             )}>
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
             </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-4 w-full justify-start">
             <div className="w-8 h-8 rounded shrink-0 bg-blue-600 flex items-center justify-center border border-blue-500"><Bot size={16} className="text-white"/></div>
             <div className="bg-gray-800 px-5 py-3 rounded-2xl rounded-bl-none border border-gray-700 shadow-md">
                <Loader2 size={18} className="text-blue-400 animate-spin" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Query telemetry or request analytical breakdowns..."
            className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-4 pr-12 py-3.5 text-sm text-gray-100 placeholder-gray-500 transition-all outline-none"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
             <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
