'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, User, Sparkles, Loader2 } from 'lucide-react'
import { AI_SERVICE } from '@/lib/ai'

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Hello! I am your AI Admissions Copilot. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    
    setIsTyping(true)
    
    try {
      const response = await AI_SERVICE.askCopilot(userMsg)
      setMessages(prev => [...prev, { role: 'ai', text: response }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error connecting to the AI engine.' }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Admissions Copilot"
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-primary rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-40"
      >
        <Sparkles size={24} aria-hidden="true" />
      </button>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-brand-surface border-l border-brand-border shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Admissions Copilot</h3>
                    <p className="text-xs text-brand-primary font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" /> Online
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-muted transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-brand-background text-brand-primary border border-brand-primary/30'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-500 text-white rounded-tr-none' 
                        : 'bg-white/5 text-text-secondary rounded-tl-none border border-white/5'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-background text-brand-primary border border-brand-primary/30 flex shrink-0 items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 text-text-secondary rounded-tl-none border border-white/5 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-primary" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-brand-background border-t border-brand-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask AI anything..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    aria-label="Send message to AI Copilot"
                    className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-brand-primary/90"
                  >
                    <Send size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="text-[10px] text-text-muted mt-2 text-center">
                  AI can make mistakes. Verify important decisions.
                </p>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
