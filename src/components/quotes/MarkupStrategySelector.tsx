import React from 'react';
import { DollarSign, Percent, Settings, Info } from 'lucide-react';
import { type MarkupStrategy } from '../../utils/pricingUtils';

interface MarkupStrategySelectorProps {
  currentStrategy: MarkupStrategy;
  onStrategyChange: (strategy: MarkupStrategy) => void;
  globalMarkup?: number;
  disabled?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function MarkupStrategySelector({
  currentStrategy,
  onStrategyChange,
  globalMarkup = 0,
  disabled = false,
  showTooltip = true,
  className = ''
}: MarkupStrategySelectorProps) {
  
  const strategies = [
    {
      value: 'global' as MarkupStrategy,
      label: 'Global Markup',
      description: 'Apply same markup to all items',
      icon: <Percent className="w-4 h-4" />,
      details: `${globalMarkup}% applied to all items uniformly`
    },
    {
      value: 'individual' as MarkupStrategy,
      label: 'Individual Markup',
      description: 'Each item has its own markup',
      icon: <Settings className="w-4 h-4" />,
      details: 'Flexible pricing with item-specific markups'
    },
    {
      value: 'mixed' as MarkupStrategy,
      label: 'Mixed Strategy',
      description: 'Individual where set, global as fallback',
      icon: <DollarSign className="w-4 h-4" />,
      details: 'Best of both: individual markups with global fallback'
    }
  ];

  const handleStrategyChange = (strategy: MarkupStrategy) => {
    if (!disabled) {
      onStrategyChange(strategy);
    }
  };

  return (
    <div className={`markup-strategy-selector ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-medium text-slate-900">Markup Strategy</h3>
        {showTooltip && (
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              Choose how markup is applied to quote items
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {strategies.map((strategy) => (
          <label
            key={strategy.value}
            className={`
              flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
              ${currentStrategy === strategy.value
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-25'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => handleStrategyChange(strategy.value)}
          >
            <input
              type="radio"
              name="markup-strategy"
              value={strategy.value}
              checked={currentStrategy === strategy.value}
              onChange={() => handleStrategyChange(strategy.value)}
              disabled={disabled}
              className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${currentStrategy === strategy.value
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {strategy.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {strategy.label}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {strategy.description}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 ml-10">
                {strategy.details}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Current Strategy Summary */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-slate-700">
            Active Strategy: {strategies.find(s => s.value === currentStrategy)?.label}
          </span>
        </div>
        <p className="text-xs text-slate-600">
          {strategies.find(s => s.value === currentStrategy)?.details}
        </p>
      </div>

      {/* Strategy Comparison Table (Optional) */}
      {currentStrategy === 'mixed' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Mixed Strategy Logic</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Items with individual markup: Use item-specific markup</li>
            <li>• Items without markup: Use global markup ({globalMarkup}%)</li>
            <li>• Best for flexible pricing with consistent fallback</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
interface CompactMarkupStrategySelectorProps {
  currentStrategy: MarkupStrategy;
  onStrategyChange: (strategy: MarkupStrategy) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactMarkupStrategySelector({
  currentStrategy,
  onStrategyChange,
  disabled = false,
  className = ''
}: CompactMarkupStrategySelectorProps) {
  
  const strategies = [
    { value: 'global' as MarkupStrategy, label: 'Global', icon: <Percent className="w-3 h-3" /> },
    { value: 'individual' as MarkupStrategy, label: 'Individual', icon: <Settings className="w-3 h-3" /> },
    { value: 'mixed' as MarkupStrategy, label: 'Mixed', icon: <DollarSign className="w-3 h-3" /> }
  ];

  return (
    <div className={`compact-markup-strategy-selector ${className}`}>
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {strategies.map((strategy) => (
          <button
            key={strategy.value}
            onClick={() => !disabled && onStrategyChange(strategy.value)}
            disabled={disabled}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
              ${currentStrategy === strategy.value
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {strategy.icon}
            <span>{strategy.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Hook for managing markup strategy state
export function useMarkupStrategy(initialStrategy: MarkupStrategy = 'global') {
  const [strategy, setStrategy] = React.useState<MarkupStrategy>(initialStrategy);
  
  const updateStrategy = React.useCallback((newStrategy: MarkupStrategy) => {
    setStrategy(newStrategy);
  }, []);

  return {
    strategy,
    updateStrategy,
    isGlobal: strategy === 'global',
    isIndividual: strategy === 'individual',
    isMixed: strategy === 'mixed'
  };
}

export default MarkupStrategySelector;