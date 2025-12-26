import React, { useState, useRef, useEffect } from 'react';
import { Message, UploadedFile, GenerationState, SavedProposal } from './types';
import { generateResponse } from './services/geminiService';
import { supabase, checkDuplicateJob } from './services/supabaseClient';
import FileUpload from './components/FileUpload';
import MessageBubble from './components/MessageBubble';
import HistoryView from './components/HistoryView';
import Auth from './components/Auth';
import SettingsModal from './components/SettingsModal';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Auth State Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hey, I'm Sagan Rios. Paste an Upwork job description below, and I'll tell you if it's a fit and draft a proposal based on your knowledge base.",
      timestamp: new Date()
    }
  ]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [input, setInput] = useState('');
  const [genState, setGenState] = useState<GenerationState>({ isGenerating: false, error: null });
  const [darkMode, setDarkMode] = useState(false);
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  
  // New States for API Key and Settings
  const [userApiKey, setUserApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [missingKeyError, setMissingKeyError] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for API Key on mount and when userApiKey changes
  useEffect(() => {
    const envKey = process.env.API_KEY;
    // Check if envKey is actually defined and not an empty string or "undefined" string
    const hasEnvKey = envKey && envKey !== "undefined" && envKey !== "";
    
    if (!hasEnvKey && !userApiKey) {
      setMissingKeyError(true);
    } else {
      setMissingKeyError(false);
    }
  }, [userApiKey]);

  // Initial Data Fetch (Only if logged in)
  useEffect(() => {
    if (session) {
        fetchHistory();
        fetchKnowledgeBase();
    }
  }, [session]);

  useEffect(() => {
    if (activeTab === 'generator') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
          setProposals(data as SavedProposal[]);
      }
  };

  const fetchKnowledgeBase = async () => {
    const { data, error } = await supabase.from('knowledge_base').select('*');
    if (!error && data) {
        setFiles(data.map(f => ({
            id: f.id,
            name: f.name,
            content: f.content,
            type: f.type || 'text/plain'
        })));
    }
  };

  // Handler for adding files (Save to Supabase)
  const handleFilesAdded = async (newFiles: UploadedFile[]) => {
      setFiles(prev => [...prev, ...newFiles]);
      
      // Persist to Supabase
      const records = newFiles.map(f => ({
          name: f.name,
          content: f.content,
          type: f.type
      }));
      
      const { error } = await supabase.from('knowledge_base').insert(records);
      if (error) console.error("Failed to save KB to DB", error);
  };

  // Handler for deleting files (Remove from Supabase)
  const removeFile = async (id: string) => {
      const fileToRemove = files.find(f => f.id === id);
      setFiles(files.filter(f => f.id !== id));

      if (fileToRemove) {
           await supabase.from('knowledge_base').delete().match({ id: id });
      }
  };
  
  // Handler for deleting a proposal
  const handleDeleteProposal = async (id: string) => {
      // Optimistic update
      setProposals(prev => prev.filter(p => p.id !== id));
      
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      
      if (error) {
          console.error('Error deleting proposal:', error);
          // Revert if failed (simple refetch)
          fetchHistory();
          alert('Failed to delete proposal.');
      }
  };

  const handleSend = async (overrideDuplicate = false) => {
    if (!input.trim() || genState.isGenerating) return;

    // Duplicate Check
    if (!overrideDuplicate) {
        const isDuplicate = await checkDuplicateJob(input);
        if (isDuplicate) {
            setShowDuplicateWarning(true);
            return;
        }
    }
    
    setShowDuplicateWarning(false);
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setGenState({ isGenerating: true, error: null });

    try {
      const kbContent = files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n');
      
      // Pass the userApiKey to the service
      const responseText = await generateResponse(userMessage.text, kbContent, userApiKey);

      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      let matchScore = null;
      if (responseText.startsWith('Match Score:')) {
          matchScore = responseText.split('\n')[0].trim();
      }

      const { error } = await supabase.from('proposals').insert({
          job_description: userMessage.text,
          proposal_text: responseText,
          match_score: matchScore
      });

      if (!error) {
          fetchHistory();
      }

    } catch (err: any) {
      console.error(err);
      const errorText = err instanceof Error ? err.message : String(err);
      
      setGenState({ 
        isGenerating: false, 
        error: errorText
      });
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: `Error: ${errorText}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setGenState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleHistorySelect = (proposal: SavedProposal) => {
      setMessages([
          {
              id: 'hist-user-' + proposal.id,
              role: 'user',
              text: proposal.job_description,
              timestamp: new Date(proposal.created_at)
          },
          {
              id: 'hist-model-' + proposal.id,
              role: 'model',
              text: proposal.proposal_text,
              timestamp: new Date(proposal.created_at)
          }
      ]);
      setActiveTab('generator');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
  };

  // Render Login if not authenticated
  if (loadingSession) {
      return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">Loading...</div>;
  }

  if (!session) {
      return <Auth />;
  }

  return (
    <div className={`${darkMode ? 'dark' : ''} h-screen flex flex-col`}>
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={userApiKey}
        onSave={(key) => setUserApiKey(key)}
      />

      {/* Missing API Key Alert - HIDDEN IF SETTINGS IS OPEN */}
      {missingKeyError && !isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500 animate-pulse-border">
                <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                     </div>
                     <h3 className="text-xl font-bold text-gray-800 dark:text-white">Missing API Key</h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    The application cannot find the <strong>Google Gemini API Key</strong>. 
                    This usually happens on new deployments (e.g., Vercel) where environment variables are not yet configured.
                </p>
                
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
                     <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Required Variable</p>
                     <code className="text-sm font-bold text-gray-800 dark:text-gray-200 block">GOOGLE_API_KEY</code>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => { setIsSettingsOpen(true); }}
                        className="w-full px-4 py-3 bg-upwork-green text-white rounded-lg hover:bg-upwork-hover font-medium shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <span>Enter Temporary Key</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                    <p className="text-xs text-center text-gray-400">
                        Or configure it in your Vercel Project Settings.
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
        
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10 transition-colors duration-200">
          <div className="flex items-center gap-3">
              <div className="text-upwork-green font-bold text-2xl tracking-tighter">upwork</div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
              <h1 className="text-lg font-medium text-gray-700 dark:text-gray-200 hidden md:block">AI Agent Bio <span className="text-gray-400 text-sm font-normal">| Sagan Rios</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'generator' ? 'bg-white dark:bg-gray-600 shadow-sm text-upwork-green' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Generator
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-600 shadow-sm text-upwork-green' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    History
                </button>
            </div>

            {/* Settings Button */}
             <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full transition-colors ${userApiKey ? 'text-upwork-green bg-green-50 dark:bg-green-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="Settings / API Key"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
             </button>

             <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Dark Mode"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
             </button>

             <button
                onClick={handleSignOut}
                className="text-xs text-red-500 hover:text-red-700 font-medium ml-1"
             >
                 Sign Out
             </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Duplicate Warning Modal/Overlay */}
          {showDuplicateWarning && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4 text-yellow-600 dark:text-yellow-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="text-lg font-bold">Duplicate Job Detected</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        You have already generated a proposal for this job description. Do you want to generate a new one anyway?
                    </p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowDuplicateWarning(false)}
                            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => handleSend(true)}
                            className="px-4 py-2 rounded-lg bg-upwork-green text-white hover:bg-upwork-hover shadow-sm font-medium"
                        >
                            Generate Anyway
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Sidebar / Knowledge Base (Only visible in Generator mode) */}
          {activeTab === 'generator' && (
             <aside className="hidden md:flex flex-col w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 shrink-0 overflow-y-auto transition-colors duration-200">
                <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-1">Knowledge Base</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Saved securely to Supabase.</p>
                <FileUpload onFilesAdded={handleFilesAdded} />
                </div>

                <div className="flex-1">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Active Files ({files.length})</h3>
                <div className="space-y-2">
                    {files.length === 0 && (
                    <div className="text-sm text-gray-400 italic text-center py-4 border border-dashed border-gray-200 dark:border-gray-600 rounded">
                        No files uploaded
                    </div>
                    )}
                    {files.map(file => (
                    <div key={file.id} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                        </div>
                        <button 
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    ))}
                </div>
                </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col relative bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            
            {activeTab === 'generator' ? (
                <>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-3xl mx-auto">
                        {messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {genState.isGenerating && (
                        <div className="flex justify-start mb-6">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                                <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-upwork-green rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-upwork-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-upwork-green rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Sagan is writing...</span>
                            </div>
                        </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    </div>

                    {/* Input Area */}
                    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shrink-0 transition-colors duration-200">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus-within:ring-2 focus-within:ring-upwork-green focus-within:border-transparent transition-all bg-white dark:bg-gray-700">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Paste Upwork Job Description here..."
                            className="w-full p-4 pr-12 min-h-[60px] max-h-[200px] bg-transparent border-none focus:ring-0 resize-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 rounded-xl"
                            rows={3}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-2">
                            <button
                            onClick={() => handleSend(false)}
                            disabled={!input.trim() || genState.isGenerating}
                            className={`p-2 rounded-full transition-colors ${
                                input.trim() && !genState.isGenerating
                                ? 'bg-upwork-green text-white hover:bg-upwork-hover shadow-md'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                            </button>
                        </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                        Pro tip: Type "Simple" to trigger stripped-down mode.
                        </p>
                    </div>
                    </div>
                </>
            ) : (
                <HistoryView 
                    proposals={proposals} 
                    onSelect={handleHistorySelect}
                    onDelete={handleDeleteProposal}
                />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;