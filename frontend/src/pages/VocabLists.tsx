import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../utils/api';

import { API_BASE_URL } from '../config/api';

interface VocabList {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  word_count: number;
  created_at: string;
}

const VocabLists: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();
  const [lists, setLists] = useState<VocabList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [newListDesc, setNewListDesc] = useState<string>('');
  
  // If listId is provided, show detail view
  const [vocabulary, setVocabulary] = useState<any[]>([]);
  const [listName, setListName] = useState<string>('');
  const [loadingVocab, setLoadingVocab] = useState<boolean>(false);

  useEffect(() => {
    console.log('VocabLists useEffect triggered:', { 
      hasToken: !!token, 
      listId: listId || 'none',
      tokenLength: token?.length || 0
    });
    if (token) {
      if (listId) {
        console.log('Loading vocabulary for list:', listId);
        // Reset vocabulary state when switching lists
        setVocabulary([]);
        setListName('');
        loadListVocabulary(parseInt(listId));
      } else {
        console.log('Loading all lists');
        loadLists();
      }
    } else {
      console.warn('No token available, cannot load lists');
      setLoading(false);
    }
  }, [token, listId]);

  const loadLists = async () => {
    if (!token) {
      console.error('loadLists called without token');
      setLoading(false);
      return;
    }
    try {
      console.log('Loading lists from:', `${API_BASE_URL}/vocab-lists/`);
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vocab-lists/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Lists API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Lists data received:', data);
        setLists(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to load lists:', response.status, errorText);
      }
    } catch (err) {
      console.error('Error loading lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/vocab-lists/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDesc,
          is_public: false,
        }),
      });

      if (response.ok) {
        setNewListName('');
        setNewListDesc('');
        setShowCreate(false);
        loadLists();
      }
    } catch (err) {
      console.error('Error creating list:', err);
    }
  };

  const loadListVocabulary = async (id: number) => {
    if (!token) return;
    try {
      setLoadingVocab(true);
      const response = await apiGet(`/vocab-lists/${id}/vocabulary`, token);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded vocabulary data:', JSON.stringify(data, null, 2));
        console.log('Vocabulary items:', JSON.stringify(data.vocabulary, null, 2));
        console.log('Vocabulary items count:', data.vocabulary?.length || 0);
        setVocabulary(data.vocabulary || []);
        setListName(data.list_name || '');
      } else {
        const errorText = await response.text();
        console.error('Failed to load vocabulary:', response.status, errorText);
      }
    } catch (err) {
      console.error('Error loading list vocabulary:', err);
    } finally {
      setLoadingVocab(false);
    }
  };

  const handleDeleteList = async (idToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this list?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/vocab-lists/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // If we're currently viewing this list's detail page, navigate back to lists
        if (listId && parseInt(listId) === idToDelete) {
          navigate('/vocab-lists');
        } else {
          loadLists();
        }
      }
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  // If showing detail view
  if (listId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <button
                onClick={() => navigate('/vocab-lists')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Lists
              </button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📚 {listName || 'Vocabulary List'}
              </h1>
              <p className="text-gray-600">
                {vocabulary.length} words in this list
              </p>
            </div>
          </div>

          {loadingVocab ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading vocabulary...</p>
            </div>
          ) : vocabulary.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No vocabulary in this list</h3>
              <p className="text-gray-500">
                Add words to this list from your vocabulary explorer
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <div className="space-y-4">
                  {vocabulary.map((item: any, index: number) => {
                    // Handle case where item might not have lemma structure
                    const lemma = item?.lemma || item;
                    const lemmaId = lemma?.id || item?.id || `item-${index}`;
                    const word = lemma?.lemma || lemma?.word || 'Unknown word';
                    const pos = lemma?.pos;
                    const definition = lemma?.definition;
                    const morphology = lemma?.morphology;
                    
                    return (
                      <div key={lemmaId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {word}
                              </h3>
                              {pos && (
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {pos}
                                </span>
                              )}
                            </div>
                            
                            {definition ? (
                              <p className="text-gray-700 mb-2 font-medium">
                                <span className="text-gray-600">Translation:</span> {definition}
                              </p>
                            ) : (
                              <p className="text-gray-500 mb-2 italic text-sm">
                                Translation not available
                              </p>
                            )}
                            
                            {morphology && morphology.forms && Array.isArray(morphology.forms) && morphology.forms.length > 1 && (
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Word Forms:</span>{' '}
                                <span className="text-gray-700">{morphology.forms.join(', ')}</span>
                              </div>
                            )}
                            
                            {morphology && typeof morphology === 'object' && Object.keys(morphology).filter(k => k !== 'forms' && k !== 'form_count' && k !== 'root' && k !== 'prefixes' && k !== 'suffixes').length > 0 && (
                              <div className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Grammar:</span>{' '}
                                {Object.entries(morphology)
                                  .filter(([key]) => {
                                    const excludeKeys = ['forms', 'form_count', 'root', 'prefixes', 'suffixes', 'derivations', 'inflections'];
                                    return !excludeKeys.includes(key);
                                  })
                                  .map(([key, value]) => {
                                    const keyFormatted = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                                    if (Array.isArray(value)) {
                                      return `${keyFormatted}: ${value.join(', ')}`;
                                    }
                                    if (value === true || value === false) {
                                      return value ? keyFormatted : '';
                                    }
                                    return `${keyFormatted}: ${value}`;
                                  })
                                  .filter(v => v)
                                  .join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full">
        <div
          className="mx-auto w-full space-y-6 px-4 phone:px-5 py-6"
          style={{ maxWidth: "var(--app-max-width)" }}
        >
          <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="mx-auto w-full space-y-6 px-4 phone:px-5 pb-4"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Vocabulary Lists
              </p>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span aria-hidden="true">📝</span> My Lists
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Organize vocabulary into custom collections
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="mr-2" aria-hidden="true">+</span>
              New List
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New List</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Italian Verbs, Travel Vocabulary"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  placeholder="Add a description for this list..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="flex-1 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Create List
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewListName('');
                    setNewListDesc('');
                  }}
                  className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {lists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-sm">
            <div className="text-6xl mb-4" aria-hidden="true">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No vocabulary lists yet
            </h3>
            <p className="mt-2 text-sm text-gray-600 mb-6">
              Create your first list to organize vocabulary from your books. Lists help you group related words for focused study.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="mr-2" aria-hidden="true">+</span>
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div 
                key={list.id} 
                className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card cursor-pointer hover:-translate-y-1 hover:shadow-floating transition-all"
                onClick={() => navigate(`/vocab-lists/${list.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{list.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={`Delete ${list.name}`}
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
                {list.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{list.description}</p>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <span aria-hidden="true">🔤</span>
                    {list.word_count} words
                  </span>
                  {list.is_public && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                      Public
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabLists;

