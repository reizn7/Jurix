import { useState, useEffect, useRef } from 'react'
import './App.css'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import CurtainLoader from './components/CurtainLoader'
import Sidebar from './components/Sidebar'
import { sendQuery, checkHealth } from './services/api'

function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showCurtain, setShowCurtain] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const chatContainerRef = useRef(null)

  
  useEffect(() => {
    checkHealth()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false))
  }, [])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (userMessage, attachedFile = null) => {
    if (!userMessage.trim() && !attachedFile) return

    
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage || 'Uploaded document for analysis',
      timestamp: new Date(),
      hasAttachment: !!attachedFile,
      fileName: attachedFile?.name
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      let response
      
      if (attachedFile) {
        // If there's a file, convert to base64 and send with query
        const fileContent = await readFileAsBase64(attachedFile)
        response = await sendQuery(userMessage || 'Please analyze this document', {
          file: fileContent,
          fileName: attachedFile.name,
          fileType: attachedFile.type
        })
      } else {
        response = await sendQuery(userMessage)
      }
      
      // Add assistant response to chat
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
    
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please make sure the backend is running and try again.',
        timestamp: new Date(),
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to read file as base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1] // Remove data:*/*;base64, prefix
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handleCurtainComplete = () => {
    setShowCurtain(false)
  }

  return (
    <div className="app">
      {/* Curtain Loader */}
      {showCurtain && <CurtainLoader onComplete={handleCurtainComplete} />}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        messages={messages}
        onClearChat={handleClearChat}
      />
      
      {/* Main App Content - wrapped for fade-in effect */}
      {!showCurtain && (
        <div className="app-content">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button className="menu-button" onClick={() => setSidebarOpen(true)} title="Open menu">
              ☰
            </button>
            <div className="logo">
              <span className="logo-icon">⚖️</span>
              <h1 className="logo-text">Jurix</h1>
            </div>
            <p className="tagline">Legal Assistant for Indian Law</p>
          </div>
          <div className="header-right">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {messages.length > 0 && (
              <button className="clear-btn" onClick={handleClearChat} title="Clear chat">
                🗑️ Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="chat-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">⚖️</div>
            <h2 className="welcome-title">Welcome to Jurix</h2>
            <p className="welcome-subtitle">Your AI-powered Legal Assistant</p>
            <div className="welcome-features">
              <div className="feature-card">
                <span className="feature-icon">📚</span>
                <h3>Legal Documents</h3>
                <p>Constitution, IPC, IT Act</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">⚖️</span>
                <h3>Case Law</h3>
                <p>Court judgments & precedents</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">💡</span>
                <h3>Smart Analysis</h3>
                <p>AI-powered legal insights</p>
              </div>
            </div>
            <div className="example-queries">
              <p className="example-title">Try asking:</p>
              <div className="example-chips">
                <button className="example-chip" onClick={() => handleSendMessage("What is Article 21?")}>
                  What is Article 21?
                </button>
                <button className="example-chip" onClick={() => handleSendMessage("Explain Section 420 IPC")}>
                  Explain Section 420 IPC
                </button>
                <button className="example-chip" onClick={() => handleSendMessage("What are my rights to privacy?")}>
                  What are my rights to privacy?
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="loading-message">
                <div className="loading-avatar">⚖️</div>
                <div className="loading-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      )}
    </div>
  )
}

export default App
