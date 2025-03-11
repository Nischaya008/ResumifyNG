import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import './InterviewPage.css'
import { FiSend, FiMessageCircle, FiVolume2, FiVolumeX, FiMic, FiMicOff, FiDownload } from 'react-icons/fi'
import axiosInstance from '../config/axios'
import { endpoints } from '../config/api'
import AudioPlayer from './AudioPlayer'

function InterviewPage() {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [thinkingMessages, setThinkingMessages] = useState(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null)
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const lastMessageRef = useRef(null)
  const recognitionRef = useRef(null)

  const toggleMute = async () => {
    try {
      const newMuteState = !isMuted
      setIsMuted(newMuteState)
      
      // Clear current audio if muting
      if (newMuteState) {
        setCurrentAudioUrl(null)
      }
      
      // Send mute state to backend
      await axiosInstance.post(endpoints.toggleMute, {
        mute: newMuteState,
        last_message: newMuteState ? null : lastMessageRef.current
      })
    } catch (error) {
      console.error('Error toggling mute:', error)
    }
  }

  const scrollToBottom = () => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const [pusherChannel, setPusherChannel] = useState(null)
  const processedMessages = useRef(new Set())

  // Set up Pusher connection
  useEffect(() => {
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
      encrypted: true
    })

    const channel = pusher.subscribe('interview-channel')
    setPusherChannel(channel)
    
    channel.bind('ai-thinking', (data) => {
      if (data.type === 'ai_thinking' && data.message_id) {
        setThinkingMessages(prev => new Set([...prev, data.message_id]))
      }
    })

    channel.bind('ai-response', (data) => {
      if (data.type === 'ai_response') {
        const messageId = data.message_id || data.message
        if (!processedMessages.current.has(messageId)) {
          processedMessages.current.add(messageId)
          // Remove thinking state for this message
          setThinkingMessages(prev => {
            const newSet = new Set(prev)
            newSet.delete(messageId)
            return newSet
          })
          setMessages(prev => [...prev, { text: data.message, sender: 'ai' }])
          lastMessageRef.current = data.message
          
          // Handle audio URL if available
          if (data.audio_url && data.speech_ready) {
            // Construct full URL using backend base URL
            const fullAudioUrl = `${import.meta.env.VITE_API_BASE_URL}${data.audio_url}`
            setCurrentAudioUrl(fullAudioUrl)
          }
        }
      }
    })

    return () => {
      pusher.unsubscribe('interview-channel')
      pusher.disconnect()
    }
  }, [])

  // Start interview after Pusher is connected
  useEffect(() => {
    if (!pusherChannel) return

    const startInterview = async () => {
      try {
        const resumeData = JSON.parse(localStorage.getItem('resumeData') || '{}')
        
        if (!resumeData.resume_data || !resumeData.job_description) {
          console.error('Missing resume data or job description')
          return
        }

        setIsConnected(true)
        
        await axiosInstance.post(endpoints.startInterview, {
          resume_data: resumeData.resume_data,
          job_description: resumeData.job_description
        })
        
      } catch (error) {
        console.error('Error starting interview:', error)
        setIsConnected(false)
      }
    }

    startInterview()
  }, [pusherChannel])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isMuted) {
        try {
          await axiosInstance.post(endpoints.toggleMute, {
            mute: true,
            last_message: null
          })
          setIsMuted(true)
          setCurrentAudioUrl(null) // Stop any playing audio
        } catch (error) {
          console.error('Error auto-muting:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleVisibilityChange)
    }
  }, [isMuted])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add scroll event handler
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // If user scrolls up more than 100px from bottom, set userScrolled to true
      setUserScrolled(scrollHeight - scrollTop - clientHeight > 100)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Reset userScrolled when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesContainerRef.current
      if (!container) return
      
      const { scrollTop, scrollHeight, clientHeight } = container
      // If already at bottom, keep auto-scrolling
      if (scrollHeight - scrollTop - clientHeight < 100) {
        setUserScrolled(false)
        scrollToBottom()
      }
    }
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (inputMessage.trim() && isConnected) {
      const messageToSend = inputMessage.trim() // Store message before clearing
      setInputMessage('') // Clear input immediately
      const resumeData = JSON.parse(localStorage.getItem('resumeData') || '{}')
      
      // If we were recording, stop it
      if (isRecording) {
        stopRecording()
      }

      // Ensure we're unmuted before sending the message
      if (isMuted) {
        try {
          await axiosInstance.post(endpoints.toggleMute, {
            mute: false,
            last_message: null
          })
          setIsMuted(false)
        } catch (error) {
          console.error('Error unmuting before sending message:', error)
        }
      }
      
      setMessages(prev => [...prev, { text: messageToSend, sender: 'user' }])
      setUserScrolled(false) // Reset scroll lock when user sends message
      
      try {
        await axiosInstance.post(endpoints.sendMessage, {
          message: messageToSend,
          resume_data: resumeData.resume_data,
          job_description: resumeData.job_description
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        console.error('Error sending message:', error)
      }
    }
  }

  const handleInputChange = (e) => {
    setInputMessage(e.target.value)
    setIsTyping(e.target.value.length > 0)
  }

  const toggleMicrophone = () => {
    if (!isRecording) {
      // Mute speaker before starting recording
      if (!isMuted) {
        toggleMute();
      }
      startRecording();
    } else {
      stopRecording();
    }
  }

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    try {
      recognitionRef.current = new window.webkitSpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => {
        setIsRecording(true)
      }

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('')
        
        setInputMessage(transcript)
        setIsTyping(transcript.length > 0)
        
        // Auto-scroll the input if needed
        const input = document.querySelector('.message-input')
        if (input) {
          input.scrollLeft = input.scrollWidth
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        stopRecording()
      }

      recognitionRef.current.onend = () => {
        stopRecording()
      }

      recognitionRef.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      stopRecording()
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const downloadTranscript = () => {
    // Create transcript content with watermark
    const watermark = "AI Interview transcript from https://resumifyng.vercel.app\n\n";
    
    // Format messages with timestamps
    const transcriptContent = messages.map(message => {
      const timestamp = new Date().toLocaleString();
      const role = message.sender === 'user' ? 'Candidate' : 'AI Interviewer';
      return `[${timestamp}] ${role}:\n${message.text}\n`;
    }).join('\n');

    // Combine watermark and transcript
    const fullTranscript = watermark + transcriptContent;

    // Create blob and download
    const blob = new Blob([fullTranscript], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_Interview_Transcript.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="interview-page">
      <div className="interview-container">
        <header className="interview-header">
          <FiMessageCircle className="header-icon" />
          <h1>Technical Interview Session | ResumifyNG</h1>
          <div className="header-controls">
            <button
              className="download-button"
              onClick={downloadTranscript}
              title="Download Transcript"
              disabled={!isConnected || messages.length === 0}
            >
              <FiDownload size={24} />
            </button>
            <button
              className={`mute-button ${isMuted ? 'muted' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
            </button>
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </header>

        <div 
          className="messages-container" 
          ref={messagesContainerRef}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-wrapper ${message.sender === 'user' ? 'user' : 'ai'}`}
            >
              <div className="message-bubble">
                <div className="message-content">{message.text}</div>
                <div className="message-timestamp">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {thinkingMessages.size > 0 && (
            <div className="message-wrapper ai">
              <div className="message-bubble thinking">
                <div className="thinking-animation">
                  <span>AI Thinking</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="message-form">
          <div className="input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type your response..."
              className="message-input"
              disabled={!isConnected}
            />
            <button
              type="button"
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onClick={toggleMicrophone}
              disabled={!isConnected}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <FiMicOff size={20} /> : <FiMic size={20} />}
            </button>
          </div>
          <button
            type="submit"
            className={`send-button ${isTyping ? 'active' : ''}`}
            disabled={!isConnected}
          >
            <FiSend size={28} strokeWidth={1.5} />
          </button>
        </form>
        <AudioPlayer
          audioUrl={currentAudioUrl}
          isMuted={isMuted}
          onEnded={() => setCurrentAudioUrl(null)}
        />
        <div className="disclaimer">
          AI Interviewer may occasionally generate incorrect responses during conversations. If the interviewer behaves unexpectedly, please reload the page. I am continuously improving the experience. Thank you for your patience!
        </div>
      </div>
    </div>
  )
}

export default InterviewPage
