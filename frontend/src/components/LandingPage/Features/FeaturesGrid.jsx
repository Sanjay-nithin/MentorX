import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

const features = [
  {
    title: 'AI-Generated Learning Paths',
    desc: "MentorX automatically generates topics, subtopics, and concept structures using advanced LLMs tailored to the user’s needs.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7h16M4 12h10M4 17h7" />
      </svg>
    ),
  },
  {
    title: 'Dynamic Concept Discovery',
    desc: 'Extracts relevant concepts from user input and mistakes to build a personalized map.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    title: 'Intelligent Practice Engine',
    desc: 'Generates high-quality questions on the fly and adapts them to you.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 7h8M8 12h8M8 17h5" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    ),
  },
  {
    title: 'Guided Reasoning Support',
    desc: 'Step-by-step prompts guide users through concepts when stuck.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l7 4-7 4-7-4 7-4Zm0 8l7 4-7 4-7-4 7-4Z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Feedback',
    desc: 'Instant evaluation with actionable feedback and explanations.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 12l4 4 10-10" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
  },
  {
    title: 'Personalized Weak-Area Analysis',
    desc: 'Detects struggles and adjusts future questions accordingly.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 18l6-6 4 4 6-10" />
      </svg>
    ),
  },
  {
    title: 'Adaptive Difficulty Tuning',
    desc: 'Difficulty scales dynamically to keep challenge manageable.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 16h4v4H4zM10 12h4v8h-4zM16 8h4v12h-4z" />
      </svg>
    ),
  },
  {
    title: 'AI-Powered Notes Generation',
    desc: 'Generates clean, structured notes from sessions and mistakes.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 4h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M14 4v6h6" />
      </svg>
    ),
  },
  {
    title: 'Concept Understanding Engine',
    desc: 'Focuses on deep understanding; analyzes reasoning quality.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="5" />
        <path d="M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    title: 'Learning Session Insights',
    desc: 'Summarizes concepts learned, mistakes, and next focus.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    title: 'Custom Learning Modes',
    desc: 'Practice, Deep Understanding, and Test modes for goals.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 8h12M6 12h12M6 16h12" />
        <circle cx="6" cy="8" r="1" />
        <circle cx="6" cy="12" r="1" />
        <circle cx="6" cy="16" r="1" />
      </svg>
    ),
  },
  {
    title: 'Doubt Solving with AI Agent',
    desc: 'Ask questions anytime; explore concepts or simpler explanations.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22l-3-3H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-3l-3 3Z" />
      </svg>
    ),
  },
  {
    title: 'Fully Personalized Curriculum',
    desc: 'Curriculum evolves uniquely for every user based on progress.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l7 4v6c0 5-7 8-7 8s-7-3-7-8V6l7-4Z" />
      </svg>
    ),
  },
  {
    title: 'Automatic Concept Organization',
    desc: 'Clusters related topics and maintains a dynamic concept graph.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M6 8l6 8M18 8l-6 10M6 6l6 0M18 6l-6 0" />
      </svg>
    ),
  },
];

export default function FeaturesGrid() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const swiperRef = useRef(null);

  // Handle window resize for responsive blur effect
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getBlurLevel = (cardIndex, currentActiveIndex) => {
    if (windowWidth < 640) {
      // Mobile: 1.75 cards visible, blur the partial second card
      if (cardIndex === currentActiveIndex + 1) {
        return { blur: 4, opacity: 0.6 };
      }
      return { blur: 0, opacity: 1 };
    } else if (windowWidth >= 1024) {
      // Desktop: 5 cards visible, center card at index 2
      const centerIndex = currentActiveIndex + 2;
      const distance = Math.abs(cardIndex - centerIndex);
      
      if (distance === 0) {
        // Center card
        return { blur: 0, opacity: 1 };
      } else if (distance === 1) {
        // Adjacent to center (slight blur)
        return { blur: 3, opacity: 0.7 };
      } else if (distance === 2) {
        // Outermost cards (heavy blur)
        return { blur: 6, opacity: 0.4 };
      }
    }
    return { blur: 0, opacity: 1 };
  };

  return (
    <section id="features" className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="text-center mb-16">
        <h2 className="inline-block text-4xl md:text-5xl font-bold text-white relative">
          Powerful Features
          {/* decorative underline wave */}
          <svg
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 w-[180px] md:w-[240px] h-6 md:h-8 mt-2"
            viewBox="0 0 340 24"
            preserveAspectRatio="none"
          >
            <path 
              d="M0 12 C40 24, 80 0, 120 12 C160 24, 200 0, 240 12 C280 24, 320 0, 360 12" 
              fill="none" 
              stroke="black" 
              strokeWidth="3" 
              opacity="0.5" 
            />
          </svg>
        </h2>
        <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
          Discover how MentorX adapts, guides, and evaluates to build deep conceptual mastery.
        </p>
      </div>

      {/* Swiper Carousel */}
      <Swiper
        ref={swiperRef}
        modules={[Autoplay, Pagination]}
        spaceBetween={24}
        slidesPerView={1.75}
        centeredSlides={false}
        loop={false}
        speed={800}
        grabCursor={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: false,
        }}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
            centeredSlides: false,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 24,
            centeredSlides: false,
          },
          1024: {
            slidesPerView: 5,
            spaceBetween: 24,
            centeredSlides: false,
          },
        }}
        className="features-swiper"
      >
        {features.map((feature, index) => {
          const { blur, opacity } = getBlurLevel(index, activeIndex);
          
          return (
            <SwiperSlide key={feature.title}>
              <div
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-white/30"
                style={{
                  height: '320px',
                  filter: blur > 0 ? `blur(${blur}px)` : 'none',
                  opacity: opacity,
                  transition: 'filter 0.5s ease, opacity 0.5s ease',
                }}
              >
                {/* Animated gradient overlay on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 70%)',
                  }}
                />
                
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                    transform: hoveredIndex === index ? 'translateX(100%)' : 'translateX(-100%)',
                    transition: 'transform 1s ease-in-out',
                  }}
                />

                <div className="relative p-6 md:p-8 h-full flex flex-col">
                  {/* Icon without background */}
                  <div className="relative mb-4">
                    <div className="relative flex h-14 w-14 items-center justify-center group-hover:scale-110 transition-all duration-300">
                      {feature.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-white transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/60 group-hover:text-white/80 transition-colors">
                      {feature.desc}
                    </p>
                  </div>

                  {/* Subtle corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <style jsx>{`
        :global(.features-swiper) {
          padding-bottom: 100px !important;
          overflow: visible !important;
        }

        :global(.swiper-wrapper) {
          align-items: stretch;
        }

        :global(.swiper-slide) {
          height: auto;
        }

        :global(.swiper-pagination) {
          bottom: -60px !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          position: absolute !important;
        }

        :global(.swiper-pagination-bullet) {
          width: 12px !important;
          height: 12px !important;
          background: #808080 !important;
          opacity: 1 !important;
          margin: 0 6px !important;
          border-radius: 50% !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
        }

        :global(.swiper-pagination-bullet:hover) {
          background: #b0b0b0 !important;
          transform: scale(1.2);
        }

        :global(.swiper-pagination-bullet-active) {
          background: #ffffff !important;
          width: 32px !important;
          border-radius: 6px !important;
        }
      `}</style>
    </section>
  );
}
