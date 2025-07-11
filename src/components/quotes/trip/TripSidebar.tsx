import React from 'react';
import { 
  Eye, 
  MapPin
} from 'lucide-react';


interface TripSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function TripSidebar({ activeSection, onSectionChange }: TripSidebarProps) {
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'itinerary', label: 'Itinerary', icon: <MapPin className="h-4 w-4" /> }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 flex flex-col shadow-2xl">
      {/* Modern Header with Gradient */}
      <div className="p-6 border-b border-blue-800/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-teal-400 rounded-lg flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Trip Builder</h2>
        </div>
        <p className="text-blue-200 text-sm mt-2">Plan your perfect journey</p>
      </div>
      
      {/* Enhanced Navigation */}
      <nav className="flex-1 p-6">
        <ul className="space-y-3">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center px-4 py-4 text-sm rounded-2xl transition-all duration-300 group ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold shadow-lg transform scale-105'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white hover:shadow-md hover:transform hover:scale-102'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  activeSection === item.id
                    ? 'bg-white/20'
                    : 'bg-white/10 group-hover:bg-white/20'
                }`}>
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: `h-5 w-5 ${activeSection === item.id ? 'text-white' : 'text-blue-200 group-hover:text-white'}`
                  })}
                </div>
                <span className="ml-4 font-medium">{item.label}</span>
                {activeSection === item.id && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Modern Footer */}
      <div className="p-6 border-t border-blue-800/30">
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-blue-200 text-xs font-medium">Need Help?</p>
          <p className="text-blue-100 text-xs mt-1">Check our travel planning guide</p>
        </div>
      </div>
    </div>
  );
} 