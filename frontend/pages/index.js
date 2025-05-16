import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';

export default function HomePage() {
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.');
  const [userMessage, setUserMessage] = useState('');
  const [model, setModel] = useState('gpt-4.1-mini');
  const [apiKey, setApiKey] = useState('');
  
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const responseEndRef = useRef(null);
  const [initialResponseOk, setInitialResponseOk] = useState(false);

  const scrollToBottom = () => {
    responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [streamingResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userMessage.trim()) {
      setError('User message cannot be empty.');
      return;
    }
    if (!apiKey.trim()) {
      setError('API Key is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStreamingResponse('');
    setInitialResponseOk(false); // Reset for each request

    let currentResponse;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''; // Default to empty string for relative path
    const apiUrl = `${apiBaseUrl}/api/chat`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: userMessage,
          model: model || 'gpt-4.1-mini',
          api_key: apiKey,
        }),
      });
      
      currentResponse = response; // Store response to check its status in catch block
      setInitialResponseOk(response.ok);

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) {
          // If response is not JSON, use statusText
          console.warn('Could not parse error response as JSON:', jsonError);
        }
        throw new Error(`API Error (${response.status}): ${errorDetail}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setStreamingResponse((prev) => prev + chunk);
        }
      }

    } catch (err) {
      console.error('Fetch error:', err);

      if (initialResponseOk && err.message && err.message.toLowerCase().includes('network error')) {
        setError(
          'Connection interrupted while receiving data. This often means a server-side issue occurred during AI response generation (e.g., API quota exceeded, model error). Please check your API provider (e.g., OpenAI) status and your server logs for specific details.'
        );
      } else if (err.message.startsWith('API Error')){
        // This is for errors thrown explicitly from !response.ok block
        setError(err.message);
      } else {
        setError(err.message || 'An unexpected error occurred. Please check console and server logs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Tropical Neon Chat</title>
        <meta name="description" content="Chat with an AI, tropical neon style!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="app-header">
        <h1 className="app-title">
          Tropical <span className="neon-highlight">Neon</span> Chat
        </h1>
      </header>

      <main className="main-content">
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="form-group">
            <label htmlFor="apiKey">OpenAI API Key:</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API Key"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="developerMessage">Developer/System Message:</label>
            <textarea
              id="developerMessage"
              value={developerMessage}
              onChange={(e) => setDeveloperMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="userMessage">Your Message:</label>
            <textarea
              id="userMessage"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Type your message to the AI..."
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="model">AI Model (optional):</label>
            <input
              type="text"
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., gpt-4.1-mini, gpt-3.5-turbo"
            />
          </div>
          
          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="neon-button" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {isLoading && !streamingResponse && <p className="loading-indicator">Waiting for response...</p>}

        {streamingResponse && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <h2 className="card-title">AI Response:</h2>
            <div className="streaming-response">
              {streamingResponse}
              <div ref={responseEndRef} />
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by FastAPI, Next.js, and Tropical Neon Vibes</p>
      </footer>
    </div>
  );
} 