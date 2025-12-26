import React, { useMemo, useState } from 'react';
import { SavedProposal } from '../types';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

interface HistoryViewProps {
  proposals: SavedProposal[];
  onSelect: (proposal: SavedProposal) => void;
}

type GroupMode = 'day' | 'week' | 'month';

const HistoryView: React.FC<HistoryViewProps> = ({ proposals, onSelect }) => {
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
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-upwork-green dark:hover:border-upwork-green cursor-pointer transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
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