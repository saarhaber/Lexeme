import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../utils/api';

const API_BASE_URL = 'http://localhost:8000/api';

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
    if (token) {
      if (listId) {
        loadListVocabulary(parseInt(listId));
      } else {
        loadLists();
      }
    }
  }, [token, listId]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vocab-lists/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLists(data);
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
        setVocabulary(data.vocabulary || []);
        setListName(data.list_name || '');
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
      <div className="min-h-screen bg-gray-50">
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
                  {vocabulary.map((item: any) => (
                    <div key={item.lemma.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {item.lemma.lemma}
                            </h3>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {item.lemma.pos || 'NOUN'}
                            </span>
                          </div>
                          
                          {item.lemma.definition ? (
                            <p className="text-gray-700 mb-2 font-medium">
                              <span className="text-gray-600">Translation:</span> {item.lemma.definition}
                            </p>
                          ) : (
                            <p className="text-gray-500 mb-2 italic text-sm">
                              Translation not available
                            </p>
                          )}
                          
                          {item.lemma.morphology && item.lemma.morphology.forms && item.lemma.morphology.forms.length > 1 && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Word Forms:</span>{' '}
                              <span className="text-gray-700">{item.lemma.morphology.forms.join(', ')}</span>
                            </div>
                          )}
                          
                          {item.lemma.morphology && Object.keys(item.lemma.morphology).filter(k => k !== 'forms' && k !== 'form_count' && k !== 'root' && k !== 'prefixes' && k !== 'suffixes').length > 0 && (
                            <div className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">Grammar:</span>{' '}
                              {Object.entries(item.lemma.morphology)
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
                  ))}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vocabulary lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📚 Vocabulary Lists
            </h1>
            <p className="text-gray-600">
              Organize vocabulary into custom collections
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New List
          </button>
        </div>

        {showCreate && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New List</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                placeholder="Description (optional)"
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateList}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewListName('');
                    setNewListDesc('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {lists.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No vocabulary lists yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first list to organize vocabulary from your books
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <div 
                key={list.id} 
                className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/vocab-lists/${list.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                {list.description && (
                  <p className="text-sm text-gray-600 mb-4">{list.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {list.word_count} words
                  </span>
                  {list.is_public && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
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

