import React, { useState, useEffect } from 'react';
import { aiService, AIExtractionResult } from '../../lib/ai';
import { useDemoAuth } from '../../hooks/useDemoAuth';
import Button from '../ui/Button';
import { 
  Brain, FileText, Mail, DollarSign, Users, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  Eye, ThumbsUp, ThumbsDown, Zap
} from 'lucide-react';

const AIExtractionPanel: React.FC = () => {
  const { authState, hasPermission } = useDemoAuth();
  const [extractions, setExtractions] = useState<AIExtractionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('apps.ai')) {
      fetchExtractions();
    }
  }, [hasPermission]);

  const fetchExtractions = async () => {
    setLoading(true);
    const { data, error } = await aiService.getPendingExtractions();
    
    if (error) {
      setError(error.message);
    } else {
      setExtractions(data || []);
    }
    
    setLoading(false);
  };

  const handleApprove = async (extractionId: string) => {
    const { error } = await aiService.approveExtraction(extractionId);
    if (!error) {
      fetchExtractions();
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'client': return Users;
      case 'project': return FileText;
      case 'cost': return DollarSign;
      case 'contact': return Mail;
      default: return Brain;
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'email': return Mail;
      case 'document': return FileText;
      case 'pdf': return FileText;
      default: return Brain;
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-neutral-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!hasPermission('apps.ai')) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">AI Access Required</h3>
        <p className="text-neutral-600">You need the 'apps.ai' permission to access AI extraction features.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-neutral-600">Loading AI extractions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">Error loading AI extractions: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">AI Data Extraction</h3>
              <p className="text-sm text-neutral-600">Review and approve AI-extracted data from emails, documents, and files</p>
              <p className="text-xs text-neutral-500 mt-1">
                Workspace: {authState.currentWorkspaceId ? 'Current workspace data' : 'All accessible data'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
              {extractions.length} pending
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExtractions}
              icon={Zap}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Extractions List */}
      {extractions.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <Brain className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Pending Extractions</h3>
          <p className="text-neutral-600">All AI extractions in your workspace have been reviewed and processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {extractions.map((extraction) => {
            const EntityIcon = getEntityIcon(extraction.entityType);
            const SourceIcon = getSourceIcon(extraction.sourceType);
            
            return (
              <div key={extraction.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-neutral-100 rounded-lg">
                        <SourceIcon className="h-6 w-6 text-neutral-600" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-neutral-900">
                            {extraction.entityType.charAt(0).toUpperCase() + extraction.entityType.slice(1)} Data Extracted
                          </h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            <EntityIcon className="h-3 w-3 mr-1" />
                            {extraction.entityType}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
                            {extraction.sourceType}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-neutral-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(extraction.createdAt).toLocaleDateString()}</span>
                          </div>
                          {extraction.confidenceScore && (
                            <div className="flex items-center space-x-1">
                              <span>Confidence:</span>
                              <span className={`font-semibold ${getConfidenceColor(extraction.confidenceScore)}`}>
                                {Math.round(extraction.confidenceScore * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Extracted Data Preview */}
                        <div className="bg-neutral-50 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-neutral-700 mb-2">Extracted Data:</h5>
                          <div className="space-y-2">
                            {Object.entries(extraction.extractedData).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2 text-sm">
                                <span className="font-medium text-neutral-600 capitalize">{key}:</span>
                                <span className="text-neutral-900">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        className="text-neutral-600 hover:text-primary-600"
                      >
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => handleApprove(extraction.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={XCircle}
                        className="text-red-600 hover:text-red-700"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIExtractionPanel;