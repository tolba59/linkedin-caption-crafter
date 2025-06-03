
import React, { useState, useCallback } from 'react';
import { generateLinkedInCaption } from './services/geminiService';
import { CaptionOption, GroundingMetadata, GroundingChunk } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import CopyButton from './components/CopyButton';

const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [captionOptions, setCaptionOptions] = useState<CaptionOption[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCaption = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL.');
      return;
    }
    try {
      new URL(urlInput);
    } catch (_) {
      setError('Invalid URL format. Please enter a full URL (e.g., https://example.com).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCaptionOptions([]);
    setGroundingSources([]);

    const result = await generateLinkedInCaption(urlInput);

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      // If there's an error but also some fallback data (e.g. single caption), display it
      if (result.captionData?.options) {
        setCaptionOptions(result.captionData.options);
      }
    } else if (result.captionData?.options && result.captionData.options.length > 0) {
      setCaptionOptions(result.captionData.options);
      if (result.groundingMetadata?.groundingChunks) {
        setGroundingSources(result.groundingMetadata.groundingChunks.filter(chunk => chunk.web));
      }
    } else {
       setError('An unexpected error occurred or no caption data was received.');
    }
  }, [urlInput]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <main className="bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-10 w-full max-w-2xl text-slate-100">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-sky-400">
            LinkedIn Caption Crafter
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Generate engaging LinkedIn captions from any article or YouTube video URL.
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <label htmlFor="urlInput" className="block text-sm font-medium text-sky-300 mb-1">
              Enter URL (article or Youtube video)
            </label>
            <input
              id="urlInput"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article-or-video"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              disabled={isLoading}
              aria-label="Article or YouTube video URL"
            />
          </div>

          <button
            onClick={handleGenerateCaption}
            disabled={isLoading || !urlInput.trim()}
            className="w-full flex items-center justify-center px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-live="polite"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Generating...
              </>
            ) : (
              'Generate Captions'
            )}
          </button>

          {error && (
            <div role="alert" className="mt-4 p-3 bg-red-700/50 border border-red-500 text-red-300 rounded-md text-sm">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {captionOptions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-700 space-y-6">
              <h2 className="text-2xl font-semibold text-sky-400 mb-4 text-center">Generated Captions:</h2>
              {captionOptions.map((option, index) => (
                <div key={index} className="bg-slate-750 p-5 rounded-lg shadow-lg border border-slate-600/50">
                  <h3 className="text-xl font-semibold text-sky-300 mb-3">Option {index + 1}</h3>
                  <div className="bg-slate-700 p-4 rounded-md whitespace-pre-wrap text-slate-200 shadow-inner mb-3">
                    <p>{option.caption}</p>
                    {option.hashtags && option.hashtags.length > 0 && (
                        <p className="mt-3 text-sky-400/90">{option.hashtags.join(' ')}</p>
                    )}
                  </div>
                  <CopyButton textToCopy={`${option.caption}\n\n${option.hashtags.join(' ')}`} />
                </div>
              ))}
            </div>
          )}
          
          {groundingSources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-sky-400 mb-2">Sources (from Google Search):</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                {groundingSources.map((source, index) => 
                  source.web && source.web.uri && (
                    <li key={index}>
                      <a 
                        href={source.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title={source.web.title || source.web.uri}
                        className="hover:text-sky-400 underline transition-colors"
                      >
                        {source.web.title || source.web.uri}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
        <footer className="text-center mt-10 text-xs text-slate-500">
            Powered by Gemini API. Gemini can make mistakes, so double-check it.
        </footer>
      </main>
    </div>
  );
};

export default App;
