import '../styles/ChatMessage.css'

function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isError = message.isError

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatContent = (content) => {
    if (!content) return null
    
    const lines = content.split('\n')
    const elements = []
    let currentList = []
    let listType = null
    let inSection = null 
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
    
      if (!trimmedLine) {
        if (currentList.length > 0) {
          elements.push(
            listType === 'numbered' 
              ? <ol key={`list-${index}`}>{currentList}</ol>
              : <ul key={`list-${index}`}>{currentList}</ul>
          )
          currentList = []
          listType = null
        }
        return
      }
      
      const h2Match = trimmedLine.match(/^##\s+(.+)/)
      if (h2Match) {
        if (currentList.length > 0) {
          elements.push(listType === 'numbered' ? <ol key={`list-${index}`}>{currentList}</ol> : <ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
          listType = null
        }
        const headingText = h2Match[1]
        const emojiMatch = headingText.match(/^([^\w\s]+)\s+(.+)/)
        if (emojiMatch) {
          elements.push(
            <h2 key={`h2-${index}`} className="section-heading">
              <span className="heading-emoji">{emojiMatch[1]}</span>
              <span>{emojiMatch[2]}</span>
            </h2>
          )
        } else {
          elements.push(<h2 key={`h2-${index}`} className="section-heading">{headingText}</h2>)
        }
        return
      }
      
      const h3Match = trimmedLine.match(/^###\s+(.+)/)
      if (h3Match) {
        if (currentList.length > 0) {
          elements.push(listType === 'numbered' ? <ol key={`list-${index}`}>{currentList}</ol> : <ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
          listType = null
        }
        elements.push(
          <h3 key={`h3-${index}`} className="subsection-heading">
            {h3Match[1]}
          </h3>
        )
        return
      }
      
      if (trimmedLine.match(/^[-]{3,}$/)) {
        if (currentList.length > 0) {
          elements.push(listType === 'numbered' ? <ol key={`list-${index}`}>{currentList}</ol> : <ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
          listType = null
        }
        elements.push(<hr key={`hr-${index}`} className="content-divider" />)
        return
      }
      
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/)
      if (numberedMatch) {
        if (listType !== 'numbered') {
          if (currentList.length > 0) {
            elements.push(<ul key={`list-${index}-prev`}>{currentList}</ul>)
          }
          currentList = []
          listType = 'numbered'
        }
        currentList.push(
          <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: formatInlineText(numberedMatch[2]) }} />
        )
        return
      }
      
      const bulletMatch = trimmedLine.match(/^[*\-•]\s+(.+)/)
      if (bulletMatch) {
        if (listType !== 'bullet') {
          if (currentList.length > 0) {
            elements.push(<ol key={`list-${index}-prev`}>{currentList}</ol>)
          }
          currentList = []
          listType = 'bullet'
        }
        currentList.push(
          <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: formatInlineText(bulletMatch[1]) }} />
        )
        return
      }
      

      if (trimmedLine.startsWith('🔗')) {
        const urlMatch = trimmedLine.match(/🔗\s+(https?:\/\/[^\s]+)/)
        if (urlMatch) {
          elements.push(
            <a key={`link-${index}`} href={urlMatch[1]} target="_blank" rel="noopener noreferrer" className="case-link">
              🔗 View Case Document
            </a>
          )
          return
        }
      }
      
      // Close any open list
      if (currentList.length > 0) {
        elements.push(
          listType === 'numbered' 
            ? <ol key={`list-${index}`}>{currentList}</ol>
            : <ul key={`list-${index}`}>{currentList}</ul>
        )
        currentList = []
        listType = null
      }
      
     
      if (trimmedLine.endsWith(':') && !trimmedLine.includes('http')) {
        elements.push(
          <div key={`subheader-${index}`} className="content-subheader">
            {trimmedLine}
          </div>
        )
      } else {
        // Regular paragraph
        elements.push(
          <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: formatInlineText(trimmedLine) }} />
        )
      }
    })
    
    // Close any remaining list
    if (currentList.length > 0) {
      elements.push(
        listType === 'numbered' 
          ? <ol key={`list-final`}>{currentList}</ol>
          : <ul key={`list-final`}>{currentList}</ul>
      )
    }
    
    return elements
  }
  
  const formatInlineText = (text) => {
    
    let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    
    
    formatted = formatted.replace(/\(([^)]+vs[^)]+)\)/g, '<em class="case-reference">($1)</em>')
    
    return formatted
  }

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'} ${isError ? 'message-error' : ''}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '⚖️'}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'Jurix'}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        <div className="message-text">
          {message.hasAttachment && (
            <div className="message-attachment">
              <span className="message-attachment-icon">📎</span>
              <span className="message-attachment-name">{message.fileName}</span>
            </div>
          )}
          {isUser ? message.content : formatContent(message.content)}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
