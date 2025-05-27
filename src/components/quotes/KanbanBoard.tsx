import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';

interface KanbanQuote {
  id: number;
  quote_reference: string;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published';
  total_price: number;
  created_at: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  quote_items?: {
    id: number;
    item_type: string;
    item_name: string;
    cost: number;
    markup: number;
    markup_type: 'percentage' | 'fixed';
  }[];
  start_date?: string;
  end_date?: string;
  traveler_count?: number;
  thumbnail_url?: string;
}

// Updated stages to match database statuses
const STAGES = [
  { key: 'Draft', label: 'Draft', description: 'Quotes being prepared' },
  { key: 'Sent', label: 'Sent', description: 'Quotes sent to customers' },
  { key: 'Converted', label: 'Converted', description: 'Quotes converted to bookings' },
  { key: 'Published', label: 'Published', description: 'Quotes published publicly' },
  { key: 'Expired', label: 'Expired', description: 'Expired quotes' },
];

// Map quote status directly to Kanban stage (no conversion needed)
function getKanbanStage(status: string): string {
  return status;
}

// Map Kanban stage back to quote status for database updates
function getQuoteStatus(stage: string): 'Draft' | 'Sent' | 'Expired' | 'Converted' | 'Published' {
  switch (stage) {
    case 'Draft':
      return 'Draft';
    case 'Sent':
      return 'Sent';
    case 'Converted':
      return 'Converted';
    case 'Published':
      return 'Published';
    case 'Expired':
      return 'Expired';
    default:
      return 'Draft';
  }
}

export const KanbanBoard: React.FC<{
  quotes: KanbanQuote[];
  onMoveStage?: (quoteId: number, newStage: string) => void;
  onQuoteUpdate?: () => void;
}> = ({ quotes, onMoveStage, onQuoteUpdate }) => {
  const navigate = useNavigate();
  
  // Group quotes by stage
  const grouped: { [stage: string]: KanbanQuote[] } = {};
  STAGES.forEach(({ key }) => (grouped[key] = []));
  quotes.forEach((q) => {
    const stage = getKanbanStage(q.status);
    if (grouped[stage]) grouped[stage].push(q);
  });

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceStage = result.source.droppableId;
    const destStage = result.destination.droppableId;
    
    if (sourceStage !== destStage) {
      const quote = grouped[sourceStage][result.source.index];
      if (quote) {
        try {
          // Update quote status in database
          const newStatus = getQuoteStatus(destStage);
          const { error } = await supabase
            .from('quotes')
            .update({ status: newStatus })
            .eq('id', quote.id);

          if (error) {
            console.error('Error updating quote status:', error);
            return;
          }

          // Call the onMoveStage callback if provided
          if (onMoveStage) {
            onMoveStage(quote.id, destStage);
          }

          // Call onQuoteUpdate to refresh the data
          if (onQuoteUpdate) {
            onQuoteUpdate();
          }
        } catch (error) {
          console.error('Error updating quote status:', error);
        }
      }
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Draft':
        return 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200';
      case 'Sent':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200';
      case 'Converted':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200';
      case 'Published':
        return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200';
      case 'Expired':
        return 'bg-gradient-to-br from-red-50 to-red-100 border-red-200';
      default:
        return 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200';
    }
  };

  const getStageHeaderColor = (stage: string) => {
    switch (stage) {
      case 'Draft':
        return 'text-slate-700';
      case 'Sent':
        return 'text-blue-700';
      case 'Converted':
        return 'text-emerald-700';
      case 'Published':
        return 'text-yellow-700';
      case 'Expired':
        return 'text-red-700';
      default:
        return 'text-slate-700';
    }
  };

  const getStageAccentColor = (stage: string) => {
    switch (stage) {
      case 'Draft':
        return 'bg-slate-500';
      case 'Sent':
        return 'bg-blue-500';
      case 'Converted':
        return 'bg-emerald-500';
      case 'Published':
        return 'bg-yellow-500';
      case 'Expired':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-[900px]">
          {STAGES.map(({ key, label, description }) => (
            <Droppable droppableId={key} key={key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 min-w-[280px] rounded-xl shadow-sm border-2 p-4 transition-all duration-300 ${
                    getStageColor(key)
                  } ${snapshot.isDraggingOver ? 'ring-2 ring-indigo-400 border-indigo-400 shadow-lg' : ''}`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className={`w-3 h-3 rounded-full ${getStageAccentColor(key)} mr-2`}></div>
                      <h3 className={`text-lg font-bold ${getStageHeaderColor(key)}`}>
                        {label}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-3 leading-relaxed">{description}</p>
                    <div className="text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-white/80 backdrop-blur-sm ${getStageHeaderColor(key)} border border-white/50 shadow-sm`}>
                        {grouped[key].length} {grouped[key].length === 1 ? 'quote' : 'quotes'}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`space-y-3 ${grouped[key].length > 10 ? 'max-h-[700px] overflow-y-auto pr-1' : ''}`}
                    style={{ minHeight: 60 }}
                  >
                    {grouped[key].length === 0 && (
                      <div className="text-gray-400 text-sm text-center py-8">
                        <div className="text-2xl mb-2">📋</div>
                        <div>No quotes</div>
                      </div>
                    )}
                    {grouped[key].map((quote, idx) => (
                      <Draggable draggableId={String(quote.id)} index={idx} key={quote.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-xl shadow-sm hover:shadow-lg p-4 flex flex-col gap-3 cursor-pointer transition-all duration-300 hover:bg-gradient-to-br hover:from-white hover:to-gray-50 border border-gray-100 ${
                              snapshot.isDragging ? 'ring-2 ring-indigo-400 shadow-xl transform rotate-1 scale-105' : 'hover:border-gray-200'
                            }`}
                            onClick={() => navigate(`/quotes/${quote.id}`)}
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/quotes/${quote.id}`); }}
                            aria-label={`View quote ${quote.quote_reference}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={quote.thumbnail_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=64&h=64&q=80'}
                                  alt="Trip thumbnail"
                                  className="w-12 h-12 rounded-lg object-cover border-2 border-gray-100 shadow-sm"
                                />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">
                                  {quote.quote_reference || `${quote.customer.first_name} ${quote.customer.last_name}`}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {quote.customer.first_name} {quote.customer.last_name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(quote.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-gray-500">
                                Items: {quote.quote_items?.length ?? 0}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                ${quote.total_price.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                quote.status === 'Converted' ? 'bg-green-100 text-green-800' :
                                quote.status === 'Published' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {quote.status}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}; 