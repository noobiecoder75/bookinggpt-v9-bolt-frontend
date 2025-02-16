import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Download, Mail, Calendar } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
        <Link
          to="/quotes/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Quote
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Total Quotes</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Draft</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Sent</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.sent}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-500">Converted</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.converted}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Converted">Converted</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* Quotes List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
              <li key={quote.id} className="hover:bg-gray-50">
                <Link to={`/quotes/${quote.id}`} className="block">
                  <div className="px-6 py-4">
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