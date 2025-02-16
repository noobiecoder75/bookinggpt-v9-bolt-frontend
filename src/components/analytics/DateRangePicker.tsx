import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="date"
          className="block w-44 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={value.start.toISOString().split('T')[0]}
          onChange={(e) => onChange({ ...value, start: new Date(e.target.value) })}
        />
      </div>
      <span className="text-gray-500">to</span>
      <input
        type="date"
        className="block w-44 px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        value={value.end.toISOString().split('T')[0]}
        onChange={(e) => onChange({ ...value, end: new Date(e.target.value) })}
      />
    </div>
  );
}