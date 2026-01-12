import { useState, useRef } from 'react'
import '../styles/ChatInput.css'

function ChatInput({ onSendMessage, isLoading }) {
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if ((input.trim() || attachedFile) && !isLoading) {
      onSendMessage(input, attachedFile)
      setInput('')
      setAttachedFile(null)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file type
      const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
      if (validTypes.includes(file.type)) {
        setAttachedFile(file)
      } else {
        alert('Please upload PDF, TXT, or DOCX files only')
      }
    }
  }

  const removeAttachment = () => {
    setAttachedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="chat-input-container">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        {attachedFile && (
          <div className="attachment-preview">
            <div className="attachment-info">
              <span className="attachment-icon">📄</span>
              <span className="attachment-name">{attachedFile.name}</span>
              <span className="attachment-size">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button 
              type="button" 
              className="remove-attachment"
              onClick={removeAttachment}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}
        <div className="input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={isLoading}
          />
          <button
            type="button"
            className="attach-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach document (PDF, TXT, DOCX)"
          >
            📎
          </button>
          <textarea
            className="chat-textarea"
            placeholder="Ask me about Indian legal documents or attach a file..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows="1"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={(!input.trim() && !attachedFile) || isLoading}
            title="Send message"
          >
            {isLoading ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span className="send-icon">➤</span>
            )}
          </button>
        </div>
        <div className="input-footer">
        </div>
      </form>
    </div>
  )
}

export default ChatInput
