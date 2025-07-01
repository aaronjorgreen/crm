import React from 'react';
import Logo from '../ui/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0,0,0) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary-100/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-primary-100/20 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="relative flex items-center justify-center min-h-screen py-16 px-8">
        <div className="w-full max-w-md space-y-10">
          {/* Header Section */}
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-xl">
                  <Logo variant="primary" size="lg" showText={false} />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-neutral-900 tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-neutral-600 leading-relaxed max-w-sm mx-auto font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Main Content Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/60 rounded-3xl blur-xl"></div>
            <div className="relative bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-neutral-50/30"></div>
              <div className="relative px-10 py-12">
                {children}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-neutral-500 leading-relaxed font-medium">
              © 2025 Innovate X Labs. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;