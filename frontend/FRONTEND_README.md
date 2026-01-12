# Jurix Frontend

Beautiful React frontend for the Jurix Legal Assistant.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔧 Configuration

### API Endpoint

The frontend connects to the FastAPI backend at `http://localhost:8000` by default.

To change this, edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000'  // Change this if needed
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatMessage.jsx      # Message display component
│   │   └── ChatInput.jsx        # Input box component
│   ├── services/
│   │   └── api.js               # API integration
│   ├── styles/
│   │   ├── ChatMessage.css      # Message styles
│   │   └── ChatInput.css        # Input styles
│   ├── App.jsx                  # Main app component
│   ├── App.css                  # App styles
│   ├── index.css                # Global styles
│   └── main.jsx                 # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 Features

- **Modern Chat Interface**: Clean, ChatGPT-like UI
- **Real-time Communication**: Instant responses from AI
- **Message History**: Persistent chat during session
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on desktop and mobile
- **Welcome Screen**: Feature cards and example queries
- **Status Indicator**: Shows backend connection status
- **Auto-scroll**: Automatically scrolls to latest message

## 🛠️ Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Deployment Options

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   - Connect your GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Serve with FastAPI**
   - Build the frontend
   - Copy `dist/` contents to your backend's static folder
   - Configure FastAPI to serve static files

## 🔗 API Integration

The frontend uses the following backend endpoints:

- `POST /api/query` - Send queries to legal assistant
- `GET /health` - Check backend health
- `GET /api/stats` - Get system statistics
- `POST /api/documents/upload` - Upload documents (future feature)

## 🎨 Customization

### Colors

Edit CSS variables in `src/index.css`:

```css
:root {
  --primary-color: #1f4e79;
  --accent-color: #4a90e2;
  /* ... more variables */
}
```

### Components

- **ChatMessage**: Modify `src/components/ChatMessage.jsx`
- **ChatInput**: Modify `src/components/ChatInput.jsx`
- **App Layout**: Modify `src/App.jsx`

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🐛 Troubleshooting

### CORS Errors

Make sure your FastAPI backend has CORS enabled:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Backend Connection Failed

1. Ensure FastAPI server is running on port 8000
2. Check the API_BASE_URL in `src/services/api.js`
3. Verify no firewall is blocking the connection

### Hot Reload Not Working

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
