import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  CheckCircle,
  Clock,
  Star,
  Calendar,
  MapPin,
  Camera,
  Building
} from 'lucide-react';

interface Quote {
  id: string;
  customer: {
    first_name: string;
    last_name: string;
  };
}

interface ClientChatProps {
  quote: Quote;
}

interface Message {
  id: string;
  sender: 'agent' | 'customer';
  content: string;
  timestamp: Date;
  type: 'text' | 'suggestion' | 'system';
  suggestions?: string[];
}

export function ClientChat({ quote }: ClientChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
              content: `Hi ${quote.customer?.first_name || 'there'}! I'm Sarah, your dedicated travel consultant. I'm so excited to help make your dream trip a reality! 🌟`,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: 'text'
    },
    {
      id: '2',
      sender: 'agent',
      content: `I've prepared a personalized itinerary just for you. Do you have any questions about the trip details, or would you like to discuss any modifications?`,
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      type: 'suggestion',
      suggestions: [
        'Tell me more about the hotels',
        'Can we adjust the itinerary?',
        'What about travel insurance?',
        'I\'m ready to book!'
      ]
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'away' | 'busy'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const customerMessage: Message = {
      id: Date.now().toString(),
      sender: 'customer',
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, customerMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: getAgentResponse(newMessage),
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 2000);
  };

  const sendSuggestion = (suggestion: string) => {
    const customerMessage: Message = {
      id: Date.now().toString(),
      sender: 'customer',
      content: suggestion,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, customerMessage]);
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: getAgentResponse(suggestion),
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 2000);
  };

  const getAgentResponse = (customerMessage: string): string => {
    const lowerMessage = customerMessage.toLowerCase();
    
    if (lowerMessage.includes('hotel')) {
      return `Great question! I've selected premium hotels with excellent ratings and perfect locations. Each property offers complimentary Wi-Fi, fitness centers, and are within walking distance of major attractions. Would you like me to show you photos and reviews of each hotel? 🏨`;
    } else if (lowerMessage.includes('adjust') || lowerMessage.includes('modify') || lowerMessage.includes('change')) {
      return `Absolutely! I'm here to make sure this trip is perfect for you. What specific changes would you like to make? We can adjust activities, dining preferences, hotel upgrades, or timing. Just let me know what you have in mind! ✨`;
    } else if (lowerMessage.includes('insurance')) {
      return `Travel insurance is definitely worth considering! I recommend comprehensive coverage that includes trip cancellation, medical emergencies, and lost baggage protection. For your trip value, premium coverage would be around $150-200. Shall I add this to your quote? 🛡️`;
    } else if (lowerMessage.includes('book') || lowerMessage.includes('ready')) {
      return `That's fantastic! I'm so excited for you! 🎉 To secure your booking, we can proceed with either a full payment or a 30% deposit. Both options come with our best price guarantee and 24-hour free cancellation. Which would you prefer?`;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return `I've worked hard to get you the best possible rates! The quote includes all taxes and fees - no hidden charges. Plus, I've negotiated some exclusive perks like complimentary breakfast and room upgrades where possible. Does the investment work within your budget? 💰`;
    } else if (lowerMessage.includes('when') || lowerMessage.includes('time')) {
      return `Perfect timing question! Your itinerary is planned for the ideal season with great weather and fewer crowds. If you need to adjust dates, I can check availability and pricing for alternative periods. When were you thinking? 📅`;
    } else {
      return `Thank you for reaching out! I'm here to help with any aspect of your trip planning. Whether it's about accommodations, activities, logistics, or you're ready to book - I've got you covered. What would be most helpful for you right now? 😊`;
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Agent Status Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&w=256&h=256&q=80" 
                  alt="Sarah Johnson" 
                  className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                />
                <div className={`absolute bottom-1 right-1 w-4 h-4 ${getStatusColor(agentStatus)} rounded-full border-2 border-white`}></div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sarah Johnson</h2>
                <p className="text-slate-600">Senior Travel Consultant</p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-slate-600">4.9/5 Rating</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium capitalize">{agentStatus}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-3 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl"></div>
        <div className="relative z-10 flex flex-col h-[600px]">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h3 className="text-lg font-bold text-slate-900">Chat with Your Travel Expert</h3>
            <p className="text-sm text-slate-600">Get instant answers and personalized recommendations</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'customer' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                    : 'bg-white text-slate-900 border border-gray-100'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${
                      message.sender === 'customer' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.sender === 'customer' && (
                      <CheckCircle className="w-3 h-3 text-blue-100" />
                    )}
                  </div>
                  
                  {/* Quick Suggestions */}
                  {message.type === 'suggestion' && message.suggestions && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => sendSuggestion(suggestion)}
                          className="block w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-white border border-gray-100">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-xs text-slate-500 ml-2">Sarah is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
        <div className="relative z-10">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => sendSuggestion('Can you help me upgrade my hotels?')}
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 text-center group"
            >
              <Building className="w-8 h-8 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-slate-700">Hotel Upgrades</span>
            </button>
            <button
              onClick={() => sendSuggestion('What activities do you recommend?')}
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 text-center group"
            >
              <Camera className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-slate-700">Add Activities</span>
            </button>
            <button
              onClick={() => sendSuggestion('Can we adjust the dates?')}
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 text-center group"
            >
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-slate-700">Change Dates</span>
            </button>
            <button
              onClick={() => sendSuggestion('Tell me about travel insurance options')}
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 text-center group"
            >
              <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-slate-700">Travel Protection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expert Tips */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-lg border border-orange-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pro Tips from Sarah</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>💡 <strong>Best Time to Book:</strong> Secure your spot now to lock in these rates!</p>
              <p>🎯 <strong>Insider Access:</strong> I can arrange exclusive experiences not available to the public</p>
              <p>📱 <strong>24/7 Support:</strong> I'm always here for you, even during your trip</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}