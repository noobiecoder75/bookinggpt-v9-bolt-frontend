import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Download, Mail, Calendar, FileText } from 'lucide-react';

interface Quote {
  id: number;
  quote_reference: string;
  status: 'Draft' | 'Sent' | 'Expired' | 'Converted';
  total_price: number;
  markup: number; // Global/average markup
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
}

export function QuotesDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            email
          ),
          quote_items (
            id,
            item_type,
            item_name,
            cost,
            markup,
            markup_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setLoading(false);
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === '' || 
      quote.quote_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${quote.customer.first_name} ${quote.customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'Draft').length,
    sent: quotes.filter(q => q.status === 'Sent').length,
    converted: quotes.filter(q => q.status === 'Converted').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Quotes</h1>
            <p className="text-gray-600 text-lg">Manage and track your travel quotes</p>
          </div>
          <Link
            to="/quotes/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Quote
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-6 h-6" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Quotes</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-amber-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <FileText className="w-6 h-6" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Draft</p>
              <p className="text-2xl font-bold text-amber-600 tracking-tight">{stats.draft}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <Mail className="w-6 h-6" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Sent</p>
              <p className="text-2xl font-bold text-blue-600 tracking-tight">{stats.sent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-green-200/50 transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center">
            <div className="bg-green-100 text-green-600 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Converted</p>
              <p className="text-2xl font-bold text-green-600 tracking-tight">{stats.converted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full sm:w-48 pl-3 pr-10 py-3 text-base border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all duration-200"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Converted">Converted</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner">Loading...</div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No quotes found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredQuotes.map((quote) => (
              <li key={quote.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200">
                <Link to={`/quotes/${quote.id}`} className="block">
                  <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-lg font-medium text-indigo-600">
                                {quote.customer.first_name[0]}
                                {quote.customer.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <h2 className="text-lg font-medium text-gray-900">
                              {quote.customer.first_name} {quote.customer.last_name}
                            </h2>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <span className="truncate">{quote.quote_reference}</span>
                              <span className="mx-2">•</span>
                              <span>${quote.total_price.toLocaleString()}</span>
                              {quote.markup > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>{quote.markup}% global markup</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quote.status === 'Draft'
                              ? 'bg-amber-100 text-amber-800'
                              : quote.status === 'Sent'
                              ? 'bg-blue-100 text-blue-800'
                              : quote.status === 'Converted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {quote.status}
                        </span>
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              // Add email functionality
                            }} 
                            className="p-2 text-gray-400 hover:text-gray-500"
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              // Add download functionality
                            }} 
                            className="p-2 text-gray-400 hover:text-gray-500"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              // Add calendar functionality
                            }} 
                            className="p-2 text-gray-400 hover:text-gray-500"
                          >
                            <Calendar className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}