import { supabase } from './supabase';

export interface AIExtractionResult {
  id: string;
  sourceType: 'email' | 'document' | 'pdf' | 'image' | 'text';
  sourceId?: string;
  extractedData: Record<string, any>;
  confidenceScore?: number;
  entityType: 'client' | 'project' | 'cost' | 'contact' | 'task';
  entityId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  reviewedBy?: string;
  reviewedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ClientExtractionData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contacts?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
}

export interface ProjectExtractionData {
  name?: string;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  requirements?: string[];
  deliverables?: string[];
}

export interface CostExtractionData {
  category?: string;
  subcategory?: string;
  description?: string;
  amount?: number;
  currency?: string;
  quantity?: number;
  supplier?: string;
  invoiceNumber?: string;
  dateIncurred?: string;
}

export const aiService = {
  // Extract data from email content
  async extractFromEmail(emailContent: string, emailMetadata?: Record<string, any>): Promise<{ data: AIExtractionResult[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    try {
      // This would integrate with your AI service (OpenAI, Claude, etc.)
      // For now, we'll simulate the extraction process
      const extractedData = await this.simulateAIExtraction(emailContent, 'email');
      
      const { data, error } = await supabase
        .from('ai_extractions')
        .insert(extractedData.map(item => ({
          source_type: 'email',
          source_id: emailMetadata?.messageId,
          extracted_data: item.data,
          confidence_score: item.confidence,
          entity_type: item.entityType,
          status: item.confidence > 0.8 ? 'auto_applied' : 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })))
        .select();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  // Extract data from document/PDF
  async extractFromDocument(documentUrl: string, documentType: 'pdf' | 'document'): Promise<{ data: AIExtractionResult[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    try {
      // This would use OCR and AI to extract text and structured data
      const documentText = await this.extractTextFromDocument(documentUrl, documentType);
      const extractedData = await this.simulateAIExtraction(documentText, documentType);
      
      const { data, error } = await supabase
        .from('ai_extractions')
        .insert(extractedData.map(item => ({
          source_type: documentType,
          source_id: documentUrl,
          extracted_data: item.data,
          confidence_score: item.confidence,
          entity_type: item.entityType,
          status: item.confidence > 0.8 ? 'auto_applied' : 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })))
        .select();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  // Get pending AI extractions for review
  async getPendingExtractions(): Promise<{ data: AIExtractionResult[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('ai_extractions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Approve AI extraction and apply to entity
  async approveExtraction(extractionId: string): Promise<{ data: any; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: extraction, error: fetchError } = await supabase
      .from('ai_extractions')
      .select('*')
      .eq('id', extractionId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    // Apply the extracted data to the appropriate entity
    let entityId: string | null = null;
    
    switch (extraction.entity_type) {
      case 'client':
        entityId = await this.applyClientData(extraction.extracted_data);
        break;
      case 'project':
        entityId = await this.applyProjectData(extraction.extracted_data);
        break;
      case 'cost':
        entityId = await this.applyCostData(extraction.extracted_data);
        break;
    }

    // Update extraction status
    const { data, error } = await supabase
      .from('ai_extractions')
      .update({
        status: 'approved',
        entity_id: entityId,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', extractionId)
      .select();

    return { data, error };
  },

  // Intelligent client assignment based on workload, expertise, etc.
  async suggestClientAssignment(clientData: ClientExtractionData): Promise<{ userId: string; confidence: number; reason: string }> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Get all active users with their current workload
    const { data: users } = await supabase
      .from('user_profiles')
      .select(`
        id, first_name, last_name, role,
        client_assignments!client_assignments_user_id_fkey(client_id),
        project_members!project_members_user_id_fkey(project_id)
      `)
      .eq('is_active', true)
      .neq('role', 'super_admin');

    if (!users || users.length === 0) {
      throw new Error('No available users for assignment');
    }

    // Calculate assignment scores based on:
    // 1. Current workload (fewer clients = higher score)
    // 2. Industry expertise (if available)
    // 3. Company size preference
    // 4. Historical performance

    const scoredUsers = users.map(user => {
      let score = 100; // Base score
      
      // Workload factor (fewer clients = higher score)
      const currentClients = user.client_assignments?.length || 0;
      score -= currentClients * 10;
      
      // Role factor (admins can handle more complex clients)
      if (user.role === 'admin') score += 20;
      
      // Industry expertise (would be enhanced with user skills data)
      if (clientData.industry) {
        // This would check user's industry experience
        score += Math.random() * 20; // Simulated for now
      }
      
      // Company size handling capability
      if (clientData.companySize === 'enterprise' && user.role === 'admin') {
        score += 30;
      }
      
      return {
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`,
        score: Math.max(0, score),
        currentClients
      };
    });

    // Sort by score and pick the best match
    scoredUsers.sort((a, b) => b.score - a.score);
    const bestMatch = scoredUsers[0];

    return {
      userId: bestMatch.userId,
      confidence: Math.min(bestMatch.score / 100, 1),
      reason: `Best match based on workload (${bestMatch.currentClients} current clients) and expertise`
    };
  },

  // Private helper methods
  private async simulateAIExtraction(content: string, sourceType: string): Promise<Array<{
    data: Record<string, any>;
    confidence: number;
    entityType: 'client' | 'project' | 'cost' | 'contact' | 'task';
  }>> {
    // This simulates AI extraction - in production, this would call your AI service
    const results = [];
    
    // Look for client information patterns
    if (content.toLowerCase().includes('company') || content.toLowerCase().includes('business')) {
      results.push({
        data: {
          name: this.extractCompanyName(content),
          email: this.extractEmail(content),
          phone: this.extractPhone(content),
          industry: this.extractIndustry(content)
        },
        confidence: 0.85,
        entityType: 'client' as const
      });
    }
    
    // Look for cost/financial information
    const costMatches = content.match(/\$[\d,]+\.?\d*/g);
    if (costMatches) {
      results.push({
        data: {
          amount: parseFloat(costMatches[0].replace(/[$,]/g, '')),
          currency: 'USD',
          description: this.extractCostDescription(content),
          category: this.categorizeCost(content)
        },
        confidence: 0.75,
        entityType: 'cost' as const
      });
    }
    
    // Look for project information
    if (content.toLowerCase().includes('project') || content.toLowerCase().includes('deadline')) {
      results.push({
        data: {
          name: this.extractProjectName(content),
          description: this.extractProjectDescription(content),
          budget: this.extractBudget(content),
          deadline: this.extractDeadline(content)
        },
        confidence: 0.70,
        entityType: 'project' as const
      });
    }
    
    return results;
  },

  private async extractTextFromDocument(url: string, type: string): Promise<string> {
    // This would use OCR services like Tesseract, Google Vision API, etc.
    // For now, return simulated text
    return `Extracted text from ${type} document at ${url}`;
  },

  private extractCompanyName(content: string): string {
    // Simple regex to find company names - would be more sophisticated in production
    const match = content.match(/([A-Z][a-z]+ (?:Inc|LLC|Corp|Company|Ltd))/);
    return match ? match[1] : 'Unknown Company';
  },

  private extractEmail(content: string): string {
    const match = content.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : '';
  },

  private extractPhone(content: string): string {
    const match = content.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0] : '';
  },

  private extractIndustry(content: string): string {
    const industries = ['technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing'];
    for (const industry of industries) {
      if (content.toLowerCase().includes(industry)) {
        return industry;
      }
    }
    return 'other';
  },

  private extractCostDescription(content: string): string {
    // Extract context around cost mentions
    const costMatch = content.match(/(.{0,50}\$[\d,]+\.?\d*.{0,50})/);
    return costMatch ? costMatch[1].trim() : 'Cost item';
  },

  private categorizeCost(content: string): string {
    const categories = {
      'shipping': ['shipping', 'delivery', 'freight'],
      'materials': ['materials', 'supplies', 'components'],
      'labor': ['labor', 'hours', 'work', 'development'],
      'travel': ['travel', 'flight', 'hotel', 'transportation']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  },

  private extractProjectName(content: string): string {
    const match = content.match(/project[:\s]+([^.\n]+)/i);
    return match ? match[1].trim() : 'New Project';
  },

  private extractProjectDescription(content: string): string {
    // Extract first sentence or paragraph that seems descriptive
    const sentences = content.split(/[.!?]+/);
    return sentences.find(s => s.length > 20 && s.length < 200) || 'Project description';
  },

  private extractBudget(content: string): number | null {
    const budgetMatch = content.match(/budget[:\s]*\$?([\d,]+)/i);
    return budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null;
  },

  private extractDeadline(content: string): string | null {
    const dateMatch = content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    return dateMatch ? dateMatch[0] : null;
  },

  private async applyClientData(data: ClientExtractionData): Promise<string | null> {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name: data.name || 'Unknown Client',
        email: data.email || '',
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        company_size: data.companySize,
        address: data.address || {},
        status: 'prospect',
        created_by: user.id,
        assigned_to: user.id
      })
      .select()
      .single();

    return client?.id || null;
  },

  private async applyProjectData(data: ProjectExtractionData): Promise<string | null> {
    // Implementation for creating project from extracted data
    return null;
  },

  private async applyCostData(data: CostExtractionData): Promise<string | null> {
    // Implementation for creating cost entry from extracted data
    return null;
  }
};