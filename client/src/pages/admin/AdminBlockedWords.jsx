import { useEffect, useState } from 'react';
import adminClient from '../../api/admin.js';
import Card from '../../components/Card.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function AdminBlockedWords() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const reload = () => adminClient.get('/blocked-words').then((r) => setWords(r.data));

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const addWord = async () => {
    if (!input.trim()) return;
    setError('');
    try {
      await adminClient.post('/blocked-words', { word: input.trim() });
      setInput('');
      await reload();
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to add word');
    }
  };

  const deleteWord = async (id) => {
    await adminClient.delete(`/blocked-words/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Blocked Words</h1>
      <p className="text-sm text-gray-500 mb-4">
        Words in this list are blocked from custom poll entries. Whole-word, case-insensitive
        matching.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Add a word..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addWord()}
        />
        <button
          onClick={addWord}
          className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          Add
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {words.length === 0 ? (
        <p className="text-gray-400 text-sm">No blocked words yet.</p>
      ) : (
        <Card>
          <div className="space-y-1">
            {words.map((w) => (
              <div
                key={w.id}
                className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-gray-50"
              >
                <span className="font-mono text-red-700">{w.word}</span>
                <button
                  onClick={() => deleteWord(w.id)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
