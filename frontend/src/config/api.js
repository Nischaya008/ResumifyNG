const API_BASE_URL = 'https://resumifyng-backend.up.railway.app'

export const endpoints = {
  uploadResume: `${API_BASE_URL}/api/upload_resume`,
  generateATS: `${API_BASE_URL}/api/generate_ats`,
  enhanceResume: `${API_BASE_URL}/api/enhance_resume`,
  startInterview: `${API_BASE_URL}/api/start_interview`,
  sendMessage: `${API_BASE_URL}/api/send_message`,
  toggleMute: `${API_BASE_URL}/api/toggle_mute`
}

export default API_BASE_URL
