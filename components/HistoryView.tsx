import React, { useMemo, useState } from 'react';
import { SavedProposal } from '../types';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

interface HistoryViewProps {
  proposals: SavedProposal[];
  onSelect: (proposal: SavedProposal) => void;
  onDelete: (id: string) => void;
}

type GroupMode = 'day' | 'week' | 'month';

const HistoryView: React.FC<HistoryViewProps> = ({ proposals, onSelect, onDelete }) => {
  const [viewMode, setViewMode] = useState<GroupMode>('day');

  const groupedProposals = useMemo(() => {
    const groups: Record<string, SavedProposal[]> = {};
    
    proposals.forEach(prop => {
      const date = parseISO(prop.created_at);
      let key = '';

      if (viewMode === 'day') {
        key = isToday(date) ? 'Today' : format(date, 'MMM d, yyyy');
      } else if (viewMode === 'week') {
        key = isThisWeek(date) ? 'This Week' : `Week of ${format(date, 'MMM d')}`;
      } else {
        key = isThisMonth(date) ? 'This Month' : format(date, 'MMMM yyyy');
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(prop);
    });

    return groups;
  }, [proposals, viewMode]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
       <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Proposal History</h2>
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                {(['day', 'week', 'month'] as GroupMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                            viewMode === mode 
                            ? 'bg-upwork-green text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
          </div>

          {Object.keys(groupedProposals).length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                  <p>No history yet. Generate your first proposal!</p>
              </div>
          ) : (
             Object.keys(groupedProposals).map(group => (
                 <div key={group} className="mb-8">
                     <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 pl-1">{group}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupedProposals[group].map(prop => (
                            <div 
                                key={prop.id} 
                                onClick={() => onSelect(prop)}
                                className="relative bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-upwork-green dark:hover:border-upwork-green cursor-pointer transition-all group"
                            >
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this proposal history? This action cannot be undone.')) {
                                            onDelete(prop.id);
                                        }
                                    }}
                                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-10"
                                    title="Delete Proposal"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>

                                <div className="flex justify-between items-start mb-2 pr-8">
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${
                                        (prop.match_score?.includes('8') || prop.match_score?.includes('9')) 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {prop.match_score ? prop.match_score.split('—')[0] : 'No Score'}
                                    </div>
                                    <span className="text-xs text-gray-400">{format(parseISO(prop.created_at), 'h:mm a')}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                    {prop.job_description}
                                </p>
                                <div className="text-xs font-medium text-upwork-green opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Proposal →
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             ))
          )}
       </div>
    </div>
  );
};

export default HistoryView;