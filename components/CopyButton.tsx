
import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text. Please try again or copy manually.');
    }
  }, [textToCopy]);

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy}
      className={`mt-2 px-4 py-2 rounded-md font-semibold text-sm transition-all duration-150 ease-in-out
                  ${!textToCopy ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 
                  copied ? 'bg-green-600 hover:bg-green-700 text-white' : 
                           'bg-sky-500 hover:bg-sky-600 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900'}`}
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 inline mr-1">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          Copied!
        </>
      ) : (
        <>
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 inline mr-1">
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.121A1.5 1.5 0 0117 6.621V16.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 16.5v-13z" />
            <path d="M4.5 6A1.5 1.5 0 003 7.5v10A1.5 1.5 0 004.5 19h7a1.5 1.5 0 001.5-1.5v-1.121A3.001 3.001 0 0012.379 15H8.5A1.5 1.5 0 017 13.5V7.5a3 3 0 00-2.5-2.95V6z" />
          </svg>
          Copy Caption
        </>
      )}
    </button>
  );
};

export default CopyButton;
