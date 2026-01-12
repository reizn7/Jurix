import { useState, useEffect } from 'react'
import '../styles/Sidebar.css'

function Sidebar({ isOpen, onClose, messages, onClearChat }) {
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    soundEffects: false,
    autoScroll: true
  })

  const [stats, setStats] = useState({
    totalQueries: 0,
    sessionsToday: 1,
    avgResponseTime: '2.3s',
    satisfaction: '95%'
  })

  useEffect(() => {
    
    const userMessages = messages.filter(msg => msg.role === 'user')
    setStats(prev => ({ ...prev, totalQueries: userMessages.length }))
  }, [messages])

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRecentHistory = () => {
    return messages
      .filter(msg => msg.role === 'user')
      .slice(-5)
      .reverse()
  }

  const formatTime = (date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffMinutes = Math.floor((now - messageDate) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return messageDate.toLocaleDateString()
  }

  return (
    <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="sidebar" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            <div className="sidebar-title">
              <span className="sidebar-logo">⚖️</span>
              <div>
                <h2>Jurix</h2>
                <p className="sidebar-subtitle">Legal Assistant Dashboard</p>
              </div>
            </div>
          </div>
          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="sidebar-content">
          {/* Statistics Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span className="sidebar-section-icon">📊</span>
              Statistics
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">💬</span>
                <div className="stat-value">{stats.totalQueries}</div>
                <p className="stat-label">Queries</p>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⚡</span>
                <div className="stat-value">{stats.avgResponseTime}</div>
                <p className="stat-label">Avg Time</p>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📅</span>
                <div className="stat-value">{stats.sessionsToday}</div>
                <p className="stat-label">Sessions</p>
              </div>
              <div className="stat-card">
                <span className="stat-icon">😊</span>
                <div className="stat-value">{stats.satisfaction}</div>
                <p className="stat-label">Satisfaction</p>
              </div>
            </div>
          </div>

          {/* Recent History Section */}
          {getRecentHistory().length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">
                <span className="sidebar-section-icon">🕐</span>
                Recent Queries
              </div>
              {getRecentHistory().map((message, index) => (
                <div key={message.id || index} className="history-item">
                  <div className="history-item-header">
                    <span className="history-item-icon">💬</span>
                    <span className="history-item-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="history-item-query">{message.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Settings Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span className="sidebar-section-icon">⚙️</span>
              Settings
            </div>
            
            <div className="settings-item" onClick={() => toggleSetting('darkMode')}>
              <div className="settings-item-header">
                <div className="settings-item-info">
                  <span className="settings-item-icon">🌙</span>
                  <div className="settings-item-text">
                    <h4>Dark Mode</h4>
                    <p>Switch to dark theme</p>
                  </div>
                </div>
                <div className={`toggle-switch ${settings.darkMode ? 'active' : ''}`}></div>
              </div>
            </div>

            <div className="settings-item" onClick={() => toggleSetting('notifications')}>
              <div className="settings-item-header">
                <div className="settings-item-info">
                  <span className="settings-item-icon">🔔</span>
                  <div className="settings-item-text">
                    <h4>Notifications</h4>
                    <p>Get response alerts</p>
                  </div>
                </div>
                <div className={`toggle-switch ${settings.notifications ? 'active' : ''}`}></div>
              </div>
            </div>

            <div className="settings-item" onClick={() => toggleSetting('soundEffects')}>
              <div className="settings-item-header">
                <div className="settings-item-info">
                  <span className="settings-item-icon">🔊</span>
                  <div className="settings-item-text">
                    <h4>Sound Effects</h4>
                    <p>Play sounds on actions</p>
                  </div>
                </div>
                <div className={`toggle-switch ${settings.soundEffects ? 'active' : ''}`}></div>
              </div>
            </div>

            <div className="settings-item" onClick={() => toggleSetting('autoScroll')}>
              <div className="settings-item-header">
                <div className="settings-item-info">
                  <span className="settings-item-icon">📜</span>
                  <div className="settings-item-text">
                    <h4>Auto Scroll</h4>
                    <p>Scroll to new messages</p>
                  </div>
                </div>
                <div className={`toggle-switch ${settings.autoScroll ? 'active' : ''}`}></div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span className="sidebar-section-icon">ℹ️</span>
              About
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-icon">📚</span>
                <div className="settings-item-text">
                  <h4>Knowledge Base</h4>
                  <p>Constitution, IPC, IT Act</p>
                </div>
              </div>
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-icon">🤖</span>
                <div className="settings-item-text">
                  <h4>AI Model</h4>
                  <p>Google Gemini 2.5 Flash</p>
                </div>
              </div>
            </div>
            <div className="settings-item">
              <div className="settings-item-info">
                <span className="settings-item-icon">🔐</span>
                <div className="settings-item-text">
                  <h4>Data Privacy</h4>
                  <p>Secure & Encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sidebar-actions">
          <button className="action-button" onClick={onClearChat}>
            <span className="action-button-icon">🗑️</span>
            Clear All Messages
          </button>
          <button className="action-button">
            <span className="action-button-icon">📥</span>
            Export Chat History
          </button>
          <button className="action-button">
            <span className="action-button-icon">❓</span>
            Help & Support
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
