
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard } from './ui/Cards';
import { Employee, Message } from '../types';

interface MessagingModuleProps {
  onBack: () => void;
  currentUser: Employee;
}

export const MessagingModule: React.FC<MessagingModuleProps> = ({ onBack, currentUser }) => {
  const { employees, messages, sendMessage, markMessagesAsRead, cloudConfig, syncData } = useERPData();
  const [activeChat, setActiveChat] = useState<string | null>(null); // 'general' or employeeId
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const prevMessagesLength = useRef(messages.length);

  // Poll for messages from RTDB if configured
  useEffect(() => {
    if (!cloudConfig.url || !cloudConfig.autoSync) return;

    const pollMessages = async () => {
      try {
        const cleanUrl = cloudConfig.url.trim().replace(/\/$/, "");
        const endpoint = `${cleanUrl}/messages.json${cloudConfig.apiKey ? `?auth=${cloudConfig.apiKey}` : ''}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const cloudMessages = await response.json();
          if (cloudMessages) {
            // Convert object to array if needed (RTDB returns object with IDs as keys)
            const msgsArray = typeof cloudMessages === 'object' && !Array.isArray(cloudMessages)
              ? Object.values(cloudMessages)
              : cloudMessages;
            
            if (Array.isArray(msgsArray)) {
              syncData({ messages: msgsArray });
            }
          }
        }
      } catch (e) {
        console.error("Chat polling error", e);
      }
    };

    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [cloudConfig.url, cloudConfig.autoSync, cloudConfig.apiKey, syncData]);

  // --- SOUND FX ---
  const playIncomingSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.senderId !== currentUser.id) {
            playIncomingSound();
        }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUser.id]);

  // Mark as read when opening chat
  useEffect(() => {
    if (activeChat) {
      markMessagesAsRead(activeChat, currentUser.id);
    }
  }, [activeChat, messages.length, currentUser.id, markMessagesAsRead]);

  const chatHistory = useMemo(() => {
    return messages.filter(m => {
      if (activeChat === 'general') {
        return m.receiverId === 'general';
      } else {
        return (m.senderId === currentUser.id && m.receiverId === activeChat) || 
               (m.senderId === activeChat && m.receiverId === currentUser.id);
      }
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, activeChat, currentUser.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = (textOverride?: string) => {
    const text = textOverride || inputText;
    if (!text.trim() || !activeChat) return;
    sendMessage(text, currentUser.id, activeChat);
    if (!textOverride) setInputText('');
  };

  const getUnreadCount = (targetId: string) => {
    return messages.filter(m => m.senderId === targetId && m.receiverId === currentUser.id && !m.read).length;
  };

  const getGeneralUnreadCount = () => {
    // For general, we don't have per-user read status easily, 
    // but we can mock it or just not show it.
    return 0;
  };

  const getSenderName = (id: string) => {
    if (id === currentUser.id) return 'Tú';
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name.split(' ')[0] : 'Desconocido';
  };

  const getRoleColor = (role: string | undefined) => {
    if (!role) return 'bg-slate-400';
    switch(role) {
      case 'Administrador': return 'bg-rose-500';
      case 'Repartidor': return 'bg-sky-500';
      case 'Planta': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.id !== currentUser.id && 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickReplies = ["Entendido", "En camino", "Pedido entregado", "Voy a planta", "Problema con ruta"];

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach(m => {
      const date = new Date(m.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return groups;
  };

  const groupedChat = groupMessagesByDate(chatHistory);

  const generalMessages = messages.filter(m => m.receiverId === 'general').sort((a, b) => b.timestamp - a.timestamp);
  const lastGeneralMsg = generalMessages[0];
  const lastGeneralTime = lastGeneralMsg ? new Date(lastGeneralMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
      
      {!activeChat ? (
        <>
          <ModuleHeader title="Mensajería" onBack={onBack} />
          
          <div className="px-6 mb-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 border border-slate-100">
              <i className="fas fa-search text-slate-300 ml-2"></i>
              <input 
                type="text" 
                placeholder="Buscar compañero..." 
                className="flex-1 bg-transparent outline-none text-sm font-bold text-sky-900 placeholder-slate-300"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 space-y-4 no-scrollbar pb-10">
            <RoundedCard onClick={() => setActiveChat('general')} className="cursor-pointer hover:bg-white/80 active:scale-[0.98] transition-all border-none shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-100">
                     <i className="fas fa-bullhorn"></i>
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-center">
                        <h4 className="font-black text-sky-900 text-sm">Canal General</h4>
                        <span className="text-[9px] font-bold text-slate-300">{lastGeneralTime}</span>
                     </div>
                     <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {lastGeneralMsg ? `${getSenderName(lastGeneralMsg.senderId)}: ${lastGeneralMsg.text}` : 'Avisos para todo el equipo'}
                     </p>
                  </div>
                  {getGeneralUnreadCount() > 0 && (
                    <div className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full min-w-[20px] text-center">
                      {getGeneralUnreadCount()}
                    </div>
                  )}
                  <i className="fas fa-chevron-right text-sky-100"></i>
               </div>
            </RoundedCard>

            <h4 className="text-[10px] font-black uppercase text-sky-300 tracking-widest px-2 mt-6 mb-2">Mensajes Directos</h4>
            
            <div className="space-y-3">
              {filteredEmployees.map(emp => {
                const unread = getUnreadCount(emp.id);
                const empMessages = messages.filter(m => 
                  (m.senderId === currentUser.id && m.receiverId === emp.id) || 
                  (m.senderId === emp.id && m.receiverId === currentUser.id)
                ).sort((a, b) => b.timestamp - a.timestamp);
                
                const lastMsg = empMessages[0];
                const lastTime = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <RoundedCard key={emp.id} onClick={() => setActiveChat(emp.id)} className="cursor-pointer hover:bg-white/80 active:scale-[0.98] transition-all border-none shadow-sm py-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white relative ${getRoleColor(emp.roles[0])}`}>
                          <span className="font-black text-lg">{emp.name.charAt(0)}</span>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-black text-sky-900 text-sm">{emp.name}</h4>
                            <span className="text-[9px] font-bold text-slate-300">
                              {lastTime}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {lastMsg ? (lastMsg.senderId === currentUser.id ? 'Tú: ' : '') + lastMsg.text : emp.roles[0]}
                            </p>
                            {unread > 0 && (
                              <div className="bg-sky-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                {unread}
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                  </RoundedCard>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full bg-slate-50">
           {/* Chat Header */}
           <div className="px-6 pt-8 pb-4 bg-white shadow-sm flex items-center gap-4 z-10 border-b border-slate-100">
              <button onClick={() => setActiveChat(null)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                 <i className="fas fa-arrow-left"></i>
              </button>
              <div className="flex-1 flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black ${activeChat === 'general' ? 'bg-indigo-500' : getRoleColor(employees.find(e => e.id === activeChat)?.roles[0])}`}>
                    {activeChat === 'general' ? <i className="fas fa-bullhorn"></i> : employees.find(e => e.id === activeChat)?.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-black text-sky-900 text-md leading-none">
                        {activeChat === 'general' ? 'Canal General' : employees.find(e => e.id === activeChat)?.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <p className="text-[9px] text-sky-400 font-bold uppercase tracking-tighter">
                          {activeChat === 'general' ? 'En línea ahora' : 'Activo ahora'}
                      </p>
                    </div>
                 </div>
              </div>
              <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <i className="fas fa-ellipsis-v"></i>
              </button>
           </div>

               <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar bg-slate-50">
                  {Object.entries(groupedChat).map(([date, msgs]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex justify-center">
                        <span className="bg-slate-200/50 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                          {date === new Date().toLocaleDateString() ? 'Hoy' : date}
                        </span>
                      </div>
                      {msgs.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        const showName = activeChat === 'general' && !isMe;
                        
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fadeIn`}>
                            {showName && (
                              <span className="text-[9px] font-black text-slate-400 ml-3 mb-1 uppercase">{getSenderName(msg.senderId)}</span>
                            )}
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed relative ${isMe ? 'bg-sky-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'}`}>
                              {msg.text}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-sky-200' : 'text-slate-300'}`}>
                                <span className="text-[8px] font-bold">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                  <i className={`fas fa-check-double text-[8px] ${msg.read ? 'text-emerald-300' : 'text-sky-300'}`}></i>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Typing Indicator Simulation */}
                  {activeChat !== 'general' && (
                    <div className="flex gap-1 items-center px-4 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <span className="text-[9px] font-bold text-slate-300 ml-1 uppercase">Escribiendo...</span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
               </div>

           {/* Quick Replies */}
           <div className="px-4 py-2 bg-white border-t border-slate-50 flex gap-2 overflow-x-auto no-scrollbar">
              {quickReplies.map(reply => (
                <button 
                  key={reply}
                  onClick={() => handleSend(reply)}
                  className="whitespace-nowrap bg-slate-100 text-slate-500 text-[10px] font-bold px-4 py-2 rounded-full hover:bg-sky-50 hover:text-sky-600 transition-colors border border-slate-200"
                >
                  {reply}
                </button>
              ))}
           </div>

           {/* Input Area */}
           <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-3 items-center">
                 <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <i className="fas fa-plus"></i>
                 </button>
                 <div className="flex-1 flex gap-2 items-center bg-slate-50 px-4 py-1 rounded-[2rem] border border-slate-200 focus-within:ring-2 ring-sky-200 transition-all">
                    <input 
                        type="text" 
                        className="flex-1 bg-transparent py-3 outline-none text-slate-700 font-bold placeholder-slate-400 text-sm"
                        placeholder="Mensaje..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button className="text-slate-300 hover:text-sky-500 transition-colors">
                      <i className="fas fa-smile"></i>
                    </button>
                 </div>
                 <button 
                    onClick={() => handleSend()}
                    disabled={!inputText.trim()}
                    className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-200 active:scale-90 transition-transform disabled:opacity-50 disabled:shadow-none"
                 >
                    <i className="fas fa-paper-plane"></i>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
