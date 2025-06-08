import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import './LandingPage.css'
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'
import { GiArrowWings } from "react-icons/gi";
import BrowserWarningModal from './BrowserWarningModal'
import TrueFocus from './TrueFocus'

function Typewriter({ roles, typingSpeed = 150, pauseTime = 1000 }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const role = roles[index];

    if (isDeleting) {
      if (charIndex > 0) {
        setTimeout(() => setCharIndex((prev) => prev - 1), typingSpeed / 2);
      } else {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % roles.length);
      }
    } else {
      if (charIndex < role.length) {
        setTimeout(() => setCharIndex((prev) => prev + 1), typingSpeed);
      } else {
        setTimeout(() => setIsDeleting(true), pauseTime);
      }
    }
  }, [charIndex, isDeleting, index, roles, typingSpeed, pauseTime]);

  useEffect(() => {
    const cursorBlinkInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorBlinkInterval);
  }, []);

  return (
    <span>
      {roles[index].substring(0, charIndex)}
      <span className="cursor" style={{ opacity: showCursor ? 1 : 0 }}>|</span>
    </span>
  );
}

function LandingPage() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showBrowserWarning, setShowBrowserWarning] = useState(false)
const isGoogleChrome = useCallback(() => {
  // Check if running in a browser environment
  if (typeof window === 'undefined') return false;

  // Get user agent and vendor
  const userAgent = navigator.userAgent.toLowerCase();
  const vendor = navigator.vendor || '';

  // Debug logs
  console.log('User Agent:', userAgent);
  console.log('Vendor:', vendor);
  console.log('Chrome Object:', typeof window.chrome);

  // Check for Brave browser specifically
  const isBrave = navigator.brave !== undefined;
  
  // First check if it's Chrome and not another browser
  const hasChrome = /chrome/.test(userAgent);
  const hasOtherBrowser = /edg|edge|opr|opera|brave|vivaldi|seamonkey|firefox/.test(userAgent);
  
  // Chrome's user agent contains 'safari', so we don't check for it
  const isChrome = hasChrome && !hasOtherBrowser;

  // Additional checks for Google Chrome specifically
  const isGoogleBrowser = (
    // Chrome reports Google Inc. as vendor
    vendor === 'Google Inc.' &&
    // Ensure Chrome object exists
    typeof window.chrome !== 'undefined' &&
    // Make sure it's not Brave
    !isBrave
  );

  const result = isChrome && isGoogleBrowser;
  console.log('Is Brave:', isBrave);
  console.log('Is Google Chrome:', result);
  return result;
    return isChrome && isGoogleBrowser;
  }, []);

  const handleGetStarted = () => {
    if (!isGoogleChrome()) {
      setShowBrowserWarning(true)
    } else {
      navigate('/app')
    }
  }
  
  const sections = [
    { id: 'hero', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'about', label: 'About' },
    { id: 'faqs', label: 'FAQs' }
  ]

  const [activeSection, setActiveSection] = useState('hero')
  const { scrollYProgress } = useScroll();
  const scrollY = useSpring(scrollYProgress, { stiffness: 200, damping: 20 });

  const features = [
    {
      title: 'Smart Resume Parsing',
      description: 'Using advanced AI technology to accurately analyze resumes in multiple formats, extracting key information while maintaining context and formatting integrity. Supporting PDF, DOCX, and LaTeX formats.',
      icon: '📄',
      color: '#646cff'
    },
    {
      title: 'ATS Optimization',
      description: 'Get detailed insights on how ATS systems view your resume. Receive specific recommendations for keywords, formatting, and content structure to ensure maximum visibility to employers.',
      icon: '🎯',
      color: '#535bf2'
    },
    {
      title: 'Job Match Analysis',
      description: 'Let the algorithm compare your resume against job descriptions, providing a comprehensive match score and suggesting targeted improvements to increase your interview chances.',
      icon: '🔍',
      color: '#4CAF50'
    },
    {
      title: 'AI Interview Practice',
      description: 'Practice with an AI interviewer that adapts questions based on your resume and target role. Get real-time feedback on your responses and detailed performance insights.',
      icon: '🤖',
      color: '#D8C3A5'
    },
    {
      title: 'Real-Time Feedback',
      description: 'Receive instant, actionable feedback on your resume and interview responses. The AI provides specific suggestions while maintaining your unique professional voice.',
      icon: '💬',
      color: '#A4978E'
    },
    {
      title: 'Career Insights',
      description: 'Access industry-specific insights and trends relevant to your career path. Stay informed about in-demand skills and optimize your professional development.',
      icon: '📈',
      color: '#FF6B6B'
    }
  ]

  const aboutCards = [
    {
      title: 'The Mission',
      description: 'To make the job application process smoother through AI-driven solutions that help you present your best professional self and land your dream role.',
      icon: '🎯'
    },
    {
      title: 'The Vision',
      description: 'Creating tools that level the playing field in the job market, making sophisticated resume analysis accessible to everyone.',
      icon: '👁️'
    },
    {
      title: 'Core Values',
      description: 'Built on the principles of innovation, accessibility, and user empowerment. Committed to providing transparent AI that works for you.',
      icon: '⭐'
    }
  ]

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      
      const x = (clientX / innerWidth) * 100
      const y = (clientY / innerHeight) * 100
      
      if (containerRef.current) {
        containerRef.current.style.setProperty('--mouse-x', `${x}%`)
        containerRef.current.style.setProperty('--mouse-y', `${y}%`)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    const root = document.getElementById('root')
    if (root) {
      root.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = ''
      if (root) {
        root.style.overflow = ''
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const maxScroll = documentHeight - viewportHeight;

        const scrollPercent = (scrollTop / maxScroll) * 100;
        console.log("Scroll Top:", scrollTop);
        console.log("Max Scroll:", maxScroll);
        console.log("Scroll Percent:", scrollPercent);

        const sectionElements = sections.map(section => {
            const el = document.getElementById(section.id);
            return el ? { id: section.id, element: el } : null;
        }).filter(Boolean);

        const scrollPosition = scrollTop + (viewportHeight / 2);

        for (const { id, element } of sectionElements) {
            if (element) {
                const { top, bottom } = element.getBoundingClientRect();
                const absoluteTop = top + window.scrollY;
                const absoluteBottom = bottom + window.scrollY;

                if (scrollPosition >= absoluteTop && scrollPosition <= absoluteBottom) {
                    setActiveSection(id);
                    break;
                }
            }
        }
    }

    const throttledScrollHandler = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', throttledScrollHandler);
    return () => window.removeEventListener('scroll', throttledScrollHandler);
  }, [sections])


  const FeatureCard = ({ feature, index }) => {
    const [ref, inView] = useInView({
      threshold: 0.2,
      triggerOnce: true
    })

    const cardVariants = {
      hidden: { opacity: 0, y: 50 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.6,
          delay: index * 0.2 
        }
      }
    }

    return (
      <motion.div
        ref={ref}
        className="feature-card"
        variants={cardVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        whileHover={{ 
          scale: 1.05,
          rotate: [0, 2, -2, 0],
          transition: { duration: 0.2 }
        }}
      >
        <div className="feature-icon" style={{ backgroundColor: feature.color }}>
          {feature.icon}
        </div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </motion.div>
    )
  }

  const scrollTracer = (
    <motion.div className="scroll-tracer">
      <motion.div className="scroll-tracer-progress" style={{ height: scrollYProgress }} />
      {sections.map((section, index) => (
        <motion.div
          key={section.id}
          className={`section-marker ${activeSection === section.id ? 'active' : ''}`}
          style={{ top: `${(index / (sections.length - 1)) * 100}%` }}
          onClick={() => {
            document.querySelector(`#${section.id}`).scrollIntoView({
              behavior: 'smooth'
            });
          }}
        >
          {section.label.split(' ').map((word, i) => (
            <div key={i}>{word}</div>
          ))}
        </motion.div>
      ))}
    </motion.div>
  )

  return (
    <div ref={containerRef} className="landing-page">
      <div className="scroll-container">
        <section id="hero" className="section hero-section" style={{ marginTop: '-70px' }}>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <TrueFocus 
              sentence="Welcome to ResumifyNG"
              manualMode={false}
              blurAmount={5}
              borderColor="#C1B09B"
              glowColor="rgba(193, 176, 155, 0.6)"
              animationDuration={0.5}
              pauseBetweenAnimations={1}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Your AI-Powered Resume & Interview Coach
          </motion.p>
          <p className="typewriter-text">
            I want to be a:- <Typewriter roles={['Full Stack Developer', 'ML Engineer', 'Data Scientist', 'UX/UI Designer', 'Software Engineer', 'Cybersecurity Engineer']} />
          </p>
        </section>

        <section id="features" className="section features-section">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Features
          </motion.h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </section>

        <section id="about" className="section about-section">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            About
          </motion.h2>
          <div className="section-content">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="section-description"
            >
              ResumifyNG combines cutting-edge AI technology with deep understanding of recruitment processes to give you the competitive edge in your job search.
            </motion.p>
            <div className="about-grid">
              {aboutCards.map((card, index) => (
                <motion.div
                  key={index}
                  className="about-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <div className="card-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="faqs" className="section faqs-section">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            FAQs
          </motion.h2>
          <div className="section-content">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="section-description"
            >
              Common questions about resume parsing, interview simulations, and privacy concerns.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="section-description"
            >
              Disclaimer: The information provided is for educational purposes only and should not be considered legal advice.
            </motion.p>
            <div className="faq-list">
              <div className="faq-item">
                <h4>What is resume parsing?</h4>
                <p>Resume parsing is the process of extracting relevant information from resumes to help employers quickly assess candidates' qualifications.</p>
              </div>
              <div className="faq-item">
                <h4>How does the AI interview practice work?</h4>
                <p>The AI interview practice simulates real interview scenarios, adapting questions based on your resume and target role, providing feedback on your responses.</p>
              </div>
              <div className="faq-item" style={{ marginBottom: '5rem' }}>
                <h4>Is my data safe?</h4>
                <p>Yes, the system prioritize user privacy and data security. Your information is stored securely and used only for the intended purposes.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      {scrollTracer}
      <motion.footer 
        className="landing-footer"
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="footer-content">
          <nav className="footer-nav">
            <p>Unlock your resume's true potential <GiArrowWings /> </p>
            <motion.button
              className="cta-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
            >
              Get Started
            </motion.button>
          </nav>
        </div>
      </motion.footer>
      <div className="linktree">
        <div className="linktree-item" data-tooltip="GitHub">
          <a href="https://github.com/Nischaya008" target="_blank" rel="noopener noreferrer">
            <FaGithub />
          </a>
        </div>
        <div className="linktree-item" data-tooltip="LinkedIn">
          <a href="https://www.linkedin.com/in/nischaya008/" target="_blank" rel="noopener noreferrer">
            <FaLinkedin />
          </a>
        </div>
        <div className="linktree-item" data-tooltip="Twitter">
          <a href="https://x.com/Nischaya008" target="_blank" rel="noopener noreferrer">
            <FaTwitter />
          </a>
        </div>
      </div>
      <BrowserWarningModal
        isOpen={showBrowserWarning}
        onClose={() => {
          setShowBrowserWarning(false)
          navigate('/app')
        }}
      />
    </div>
  )
}

export default LandingPage 
