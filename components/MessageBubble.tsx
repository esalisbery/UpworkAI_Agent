import React, { useState } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Parsing logic to separate "Match Score" from the "Proposal"
  let scoreContent: string | null = null;
  let proposalContent = message.text;

  // Only parse if it's a model message and starts with the expected pattern
  if (!isUser && message.text.startsWith('Match Score:')) {
    const firstNewLineIndex = message.text.indexOf('\n');
    if (firstNewLineIndex !== -1) {
      scoreContent = message.text.substring(0, firstNewLineIndex).trim();
      // Remove the score line and any leading whitespace/newlines from the rest
      proposalContent = message.text.substring(firstNewLineIndex).trim();
    }
  }

  const handleCopy = () => {
    // Only copy the proposal content, excluding the score
    navigator.clipboard.writeText(proposalContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Helper to get score number for color coding (optional enhancement)
  const getScoreColor = (text: string) => {
    const match = text.match(/(\d+)%/);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 80) return 'text-upwork-green border-upwork-green bg-green-50 dark:bg-green-900/20';
      if (score >= 50) return 'text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      return 'text-red-600 border-red-500 bg-red-50 dark:bg-red-900/20';
    }
    return 'text-gray-700 border-gray-300 bg-gray-50 dark:bg-gray-800';
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[90%] md:max-w-[80%] flex flex-col gap-3`}>
        
        {/* Model Info Header */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <div className="h-6 w-6 rounded-full bg-upwork-dark flex items-center justify-center text-xs text-white font-bold shadow-sm">
              SR
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sagan Rios</span>
          </div>
        )}

        {/* Separate Score Card */}
        {scoreContent && (
          <div className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${getScoreColor(scoreContent)} dark:border-opacity-60`}>
             <div className="shrink-0 mt-0.5">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="font-medium text-sm leading-relaxed">
               {scoreContent}
             </div>
          </div>
        )}

        {/* Main Message Bubble (Proposal) */}
        <div
          className={`relative rounded-2xl p-6 shadow-sm whitespace-pre-wrap leading-relaxed group border ${
            isUser
              ? 'bg-upwork-green text-white border-transparent rounded-br-none'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700 rounded-tl-none'
          }`}
        >
          {/* Copy Button (Only for Model, attached to Proposal) */}
          {!isUser && (
            <div className="absolute top-4 right-4">
               <button 
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm"
                title="Copy Proposal Only"
              >
                {copied ? (
                  <div className="flex items-center gap-1.5">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                     </svg>
                     <span className="text-xs font-semibold text-green-600 dark:text-green-400">Copied</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span className="text-xs font-medium">Copy Proposal</span>
                  </div>
                )}
              </button>
            </div>
          )}
          
          <div className="font-sans text-sm md:text-base">
              {proposalContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;