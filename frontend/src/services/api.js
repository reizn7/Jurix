const API_BASE_URL = 'http://localhost:8005'

/**

 * @param {string} query - 
 * @param {Object} fileData - 
 * @returns {Promise<Object>} - 
 */
export async function sendQuery(query, fileData = null) {
  const requestBody = {
    query: query,
    debug: false
  }

  // Add file data if provided
  if (fileData) {
    requestBody.file = fileData.file
    requestBody.fileName = fileData.fileName
    requestBody.fileType = fileData.fileType
  }

  const response = await fetch(`${API_BASE_URL}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response.json()
}

/**

 * @returns {Promise<Object>} 
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  
  if (!response.ok) {
    throw new Error('Backend is not responding')
  }

  return response.json()
}

/**
 * @returns {Promise<Object>} 
 */
export async function getStats() {
  const response = await fetch(`${API_BASE_URL}/api/stats`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }

  return response.json()
}

/**
 * @param {File} file -
 * @param {string} title -
 * @returns {Promise<Object>} -
 */
export async function uploadDocument(file, title) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)

  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response.json()
}
