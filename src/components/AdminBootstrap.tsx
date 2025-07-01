import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import Input from './ui/Input';
import Logo from './ui/Logo';
import { User, Mail, Lock, Shield, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const AdminBootstrap: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasUsers, setHasUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    checkForExistingUsers();
  }, []);

  const checkForExistingUsers = async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('has_users');
      
      if (error) {
        console.error('Error checking for users:', error);
        setError(error.message);
      } else {
        setHasUsers(data);
      }
    } catch (err: any) {
      console.error('Exception checking for users:', err);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      // Use signUp instead of RPC to create the first admin
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'super_admin' // Set role in metadata
          }
        }
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Failed to create admin user');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader className="h-12 w-12 text-primary-600 animate-spin mx-auto" />
          <p className="text-neutral-600 font-medium">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (hasUsers) {
    return null; // Don't show bootstrap if users already exist
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Admin Created Successfully!</h1>
          <p className="text-neutral-600 mb-6">
            Your admin account has been created. You will be redirected to the login page shortly.
          </p>
          <div className="animate-pulse text-sm text-neutral-500">
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

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
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
                <h1 className="text-4xl font-bold text-neutral-900 tracking-tight leading-tight">
                  Admin Setup
                </h1>
              </div>
              <p className="text-lg text-neutral-600 leading-relaxed max-w-sm mx-auto font-medium">
                Create the first administrator account for your CRM system
              </p>
            </div>
          </div>
          
          {/* Main Content Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/60 rounded-3xl blur-xl"></div>
            <div className="relative bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-neutral-50/30"></div>
              <div className="relative px-10 py-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-xl text-sm">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Setup Error</div>
                          <div className="mt-1">{error}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      icon={User}
                      placeholder="John"
                      required
                      fullWidth
                    />
                    <Input
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      required
                      fullWidth
                    />
                  </div>

                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    icon={Mail}
                    placeholder="admin@company.com"
                    required
                    fullWidth
                  />

                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    icon={Lock}
                    placeholder="Create a secure password"
                    required
                    fullWidth
                    helperText="Minimum 8 characters"
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    icon={Lock}
                    placeholder="Confirm your password"
                    required
                    fullWidth
                  />

                  <div className="pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={loading}
                      icon={Shield}
                    >
                      Create Admin Account
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-neutral-500 leading-relaxed font-medium">
              This will create the first administrator account for your CRM system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBootstrap;