import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  Sun, Moon, Sunrise, Sunset, Clock
} from 'lucide-react';

const GreetingPanel: React.FC = () => {
  const { authState } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Enhanced time-based greeting with more nuanced periods
  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours();
    
    if (hour >= 5 && hour < 8) {
      return { 
        text: 'Rise and shine', 
        icon: Sunrise, 
        color: 'from-orange-400 via-pink-400 to-red-400'
      };
    }
    if (hour >= 8 && hour < 12) {
      return { 
        text: 'Good morning', 
        icon: Sun, 
        color: 'from-yellow-400 via-amber-400 to-orange-400'
      };
    }
    if (hour >= 12 && hour < 17) {
      return { 
        text: 'Good afternoon', 
        icon: Sun, 
        color: 'from-blue-400 via-cyan-400 to-teal-400'
      };
    }
    if (hour >= 17 && hour < 20) {
      return { 
        text: 'Good evening', 
        icon: Sunset, 
        color: 'from-purple-400 via-pink-400 to-rose-400'
      };
    }
    return { 
      text: 'Working late', 
      icon: Moon, 
      color: 'from-indigo-400 via-purple-400 to-blue-400'
    };
  };

  const greeting = getTimeBasedGreeting();
  const GreetingIcon = greeting.icon;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Use firstName and lastName from user profile
  const displayName = authState.user?.firstName || 'User';

  return (
    <div className="relative h-48 overflow-hidden rounded-3xl border border-neutral-200/60 shadow-xl">
      {/* Animated Ocean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600">
        {/* Ocean Waves - Multiple layers for depth */}
        <div className="absolute inset-0">
          {/* Deep ocean layer */}
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              background: `
                radial-gradient(ellipse 800px 200px at 50% 100%, rgba(59, 130, 246, 0.8) 0%, transparent 50%),
                radial-gradient(ellipse 600px 150px at 20% 80%, rgba(34, 197, 94, 0.6) 0%, transparent 50%),
                radial-gradient(ellipse 700px 180px at 80% 90%, rgba(14, 165, 233, 0.7) 0%, transparent 50%)
              `,
              animation: 'oceanFlow 8s ease-in-out infinite'
            }}
          />
          
          {/* Mid ocean layer */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              background: `
                radial-gradient(ellipse 1000px 120px at 30% 85%, rgba(56, 189, 248, 0.9) 0%, transparent 60%),
                radial-gradient(ellipse 800px 100px at 70% 95%, rgba(34, 211, 238, 0.8) 0%, transparent 60%)
              `,
              animation: 'oceanFlow 12s ease-in-out infinite reverse'
            }}
          />
          
          {/* Surface waves */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(255, 255, 255, 0.3) 25%, 
                  transparent 50%, 
                  rgba(255, 255, 255, 0.2) 75%, 
                  transparent 100%
                )
              `,
              animation: 'waveShimmer 6s linear infinite'
            }}
          />
          
          {/* Foam and bubbles */}
          <div className="absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/20"
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${60 + Math.random() * 40}%`,
                  animation: `bubble ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          {/* Flowing current lines */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 20px,
                  rgba(255, 255, 255, 0.1) 20px,
                  rgba(255, 255, 255, 0.1) 22px
                )
              `,
              animation: 'currentFlow 15s linear infinite'
            }}
          />
        </div>
        
        {/* Sunlight rays filtering through water */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            background: `
              linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.4) 0%,
                transparent 30%,
                transparent 70%,
                rgba(255, 255, 255, 0.2) 100%
              )
            `,
            animation: 'sunRays 10s ease-in-out infinite alternate'
          }}
        />
      </div>

      {/* Content overlay with glassmorphism */}
      <div className="relative z-10 h-full bg-white/10 backdrop-blur-sm">
        <div className="h-full p-8 flex items-center justify-between">
          {/* Main Greeting Section */}
          <div className="space-y-4">
            {/* Time & Greeting */}
            <div className="flex items-center space-x-4">
              {/* Enhanced Creative Emblem */}
              <div className="relative group">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 opacity-20 animate-spin" style={{ animationDuration: '20s' }}></div>
                
                {/* Middle pulsing ring */}
                <div className="absolute inset-1 w-18 h-18 rounded-full bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500 opacity-30 animate-pulse"></div>
                
                {/* Inner floating ring */}
                <div className="absolute inset-2 w-16 h-16 rounded-full bg-gradient-to-r from-primary-200 via-primary-300 to-primary-400 opacity-40 animate-float"></div>
                
                {/* Core emblem container */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 shadow-2xl backdrop-blur-sm border-2 border-white/30 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
                  {/* Inner glow effect */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                  
                  {/* Sparkle effects */}
                  <div className="absolute top-2 right-3 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                  <div className="absolute bottom-3 left-2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-4 left-4 w-0.5 h-0.5 bg-white rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
                  
                  {/* Central icon with enhanced styling */}
                  <div className="relative z-10 p-2">
                    <GreetingIcon className="h-8 w-8 text-white drop-shadow-lg filter brightness-110" />
                  </div>
                  
                  {/* Orbital elements */}
                  <div className="absolute inset-0 rounded-full">
                    <div className="absolute top-0 left-1/2 w-1 h-1 bg-white/60 rounded-full transform -translate-x-1/2 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-white/60 rounded-full transform -translate-x-1/2 animate-bounce" style={{ animationDelay: '1.5s' }}></div>
                    <div className="absolute left-0 top-1/2 w-1 h-1 bg-white/60 rounded-full transform -translate-y-1/2 animate-bounce" style={{ animationDelay: '2.5s' }}></div>
                    <div className="absolute right-0 top-1/2 w-1 h-1 bg-white/60 rounded-full transform -translate-y-1/2 animate-bounce" style={{ animationDelay: '3.5s' }}></div>
                  </div>
                </div>
                
                {/* Floating particles around emblem */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-primary-300 rounded-full opacity-60"
                    style={{
                      top: `${20 + Math.sin(i * Math.PI / 4) * 35}px`,
                      left: `${20 + Math.cos(i * Math.PI / 4) * 35}px`,
                      animation: `orbit ${8 + i}s linear infinite`,
                      animationDelay: `${i * 0.5}s`
                    }}
                  />
                ))}
              </div>
              
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                  {greeting.text}, {displayName}!
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-white/90 font-medium drop-shadow">
                    {formatDate(currentTime)}
                  </p>
                  <div className="flex items-center space-x-2 text-white/80">
                    <Clock className="h-4 w-4 drop-shadow" />
                    <span className="font-mono text-sm drop-shadow">{formatTime(currentTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role indicator with enhanced styling */}
          <div className="relative">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400/20 to-primary-600/20 rounded-2xl blur-xl"></div>
            
            {/* Main container */}
            <div className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full animate-pulse"></div>
                <div>
                  <div className="text-white/90 text-sm font-semibold drop-shadow">
                    {authState.user?.role === 'admin' ? 'Administrator' : 
                     authState.user?.role === 'super_admin' ? 'Super Administrator' : 'Team Member'}
                  </div>
                  <div className="text-white/70 text-xs drop-shadow font-medium">
                    Innovate X Labs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style jsx>{`
        @keyframes oceanFlow {
          0%, 100% { transform: translateX(0) translateY(0) scale(1); }
          25% { transform: translateX(-10px) translateY(-5px) scale(1.02); }
          50% { transform: translateX(5px) translateY(-8px) scale(0.98); }
          75% { transform: translateX(-5px) translateY(-3px) scale(1.01); }
        }
        
        @keyframes waveShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes bubble {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
        
        @keyframes currentFlow {
          0% { transform: translateX(-50px); }
          100% { transform: translateX(50px); }
        }
        
        @keyframes sunRays {
          0% { opacity: 0.15; transform: rotate(0deg); }
          100% { opacity: 0.35; transform: rotate(2deg); }
        }
        
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

export default GreetingPanel;