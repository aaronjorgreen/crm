import { supabase } from './supabase';
import { 
  Client, 
  ClientContact, 
  ClientCommunication, 
  Invoice,
  ClientFilters, 
  ClientStats 
} from '../types/project';

export const clientService = {
  // Get all clients with filters
  async getClients(filters: ClientFilters = {}): Promise<{ data: Client[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_contacts!client_contacts_client_id_fkey(*),
        projects!projects_client_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.industry && filters.industry.length > 0) {
      query = query.in('industry', filters.industry);
    }

    if (filters.companySize && filters.companySize.length > 0) {
      query = query.in('company_size', filters.companySize);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters.totalValueRange) {
      query = query.gte('total_value', filters.totalValueRange.min)
                  .lte('total_value', filters.totalValueRange.max);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Transform the data
    const transformedData = data?.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      website: client.website,
      industry: client.industry,
      companySize: client.company_size,
      address: client.address,
      contacts: client.client_contacts?.map((contact: any) => ({
        id: contact.id,
        clientId: contact.client_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.is_primary,
        createdAt: contact.created_at
      })) || [],
      projects: client.projects?.map((project: any) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress || 0,
        budget: project.budget,
        startDate: project.start_date,
        endDate: project.end_date
      })) || [],
      totalValue: client.total_value || 0,
      status: client.status,
      tags: client.tags || [],
      notes: client.notes || '',
      createdBy: client.created_by,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      lastContactDate: client.last_contact_date,
      nextFollowUpDate: client.next_follow_up_date,
      workspaceId: client.workspace_id
    })) || [];

    return { data: transformedData, error: null };
  },

  // Get single client by ID
  async getClientById(id: string): Promise<{ data: Client | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_contacts!client_contacts_client_id_fkey(*),
        projects!projects_client_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) return { data: null, error };

    const transformedData = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      website: data.website,
      industry: data.industry,
      companySize: data.company_size,
      address: data.address,
      contacts: data.client_contacts?.map((contact: any) => ({
        id: contact.id,
        clientId: contact.client_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.is_primary,
        createdAt: contact.created_at
      })) || [],
      projects: data.projects?.map((project: any) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress || 0,
        budget: project.budget,
        startDate: project.start_date,
        endDate: project.end_date
      })) || [],
      totalValue: data.total_value || 0,
      status: data.status,
      tags: data.tags || [],
      notes: data.notes || '',
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastContactDate: data.last_contact_date,
      nextFollowUpDate: data.next_follow_up_date,
      workspaceId: data.workspace_id
    };

    return { data: transformedData, error: null };
  },

  // Create new client
  async createClient(clientData: Partial<Client>): Promise<{ data: Client | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get user's default workspace if no workspace specified
    let workspaceId = clientData.workspaceId;
    if (!workspaceId) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();
      
      workspaceId = userProfile?.default_workspace_id;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        website: clientData.website,
        industry: clientData.industry,
        company_size: clientData.companySize,
        address: clientData.address,
        status: clientData.status || 'prospect',
        tags: clientData.tags || [],
        notes: clientData.notes || '',
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) return { data: null, error };

    return this.getClientById(data.id);
  },

  // Update client
  async updateClient(id: string, updates: Partial<Client>): Promise<{ data: Client | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.industry !== undefined) updateData.industry = updates.industry;
    if (updates.companySize !== undefined) updateData.company_size = updates.companySize;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
    if (updates.lastContactDate !== undefined) updateData.last_contact_date = updates.lastContactDate;
    if (updates.nextFollowUpDate !== undefined) updateData.next_follow_up_date = updates.nextFollowUpDate;
    if (updates.workspaceId !== undefined) updateData.workspace_id = updates.workspaceId;

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id);

    if (error) return { data: null, error };

    return this.getClientById(id);
  },

  // Delete client
  async deleteClient(id: string): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    return { error };
  },

  // Add client contact
  async addClientContact(contactData: Partial<ClientContact>): Promise<{ data: ClientContact | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('client_contacts')
      .insert({
        client_id: contactData.clientId,
        first_name: contactData.firstName,
        last_name: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        role: contactData.role,
        is_primary: contactData.isPrimary || false
      })
      .select()
      .single();

    if (error) return { data: null, error };

    return { data, error: null };
  },

  // Get client communications
  async getClientCommunications(clientId: string): Promise<{ data: ClientCommunication[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('client_communications')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const transformedData = data?.map(comm => ({
      id: comm.id,
      clientId: comm.client_id,
      type: comm.type,
      subject: comm.subject,
      content: comm.content,
      direction: comm.direction,
      contactId: comm.contact_id,
      userId: comm.user_id,
      attachments: comm.attachments || [],
      scheduledAt: comm.scheduled_at,
      completedAt: comm.completed_at,
      createdAt: comm.created_at,
      user: {
        id: comm.user.id,
        firstName: comm.user.first_name,
        lastName: comm.user.last_name,
        avatarUrl: comm.user.avatar_url
      }
    })) || [];

    return { data: transformedData, error: null };
  },

  // Add client communication
  async addClientCommunication(commData: Partial<ClientCommunication>): Promise<{ data: ClientCommunication | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('client_communications')
      .insert({
        client_id: commData.clientId,
        type: commData.type,
        subject: commData.subject,
        content: commData.content,
        direction: commData.direction || 'outbound',
        contact_id: commData.contactId,
        user_id: user.id,
        attachments: commData.attachments || [],
        scheduled_at: commData.scheduledAt,
        completed_at: commData.completedAt
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Update client's last contact date
    await this.updateClient(commData.clientId!, { 
      lastContactDate: new Date().toISOString() 
    });

    return { data, error: null };
  },

  // Get client invoices
  async getClientInvoices(clientId: string): Promise<{ data: Invoice[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    return { data, error: null };
  },

  // Create invoice
  async createInvoice(invoiceData: Partial<Invoice>): Promise<{ data: Invoice | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastInvoice?.invoice_number ? 
      parseInt(lastInvoice.invoice_number.replace('INV-', '')) : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: invoiceData.clientId,
        project_id: invoiceData.projectId,
        invoice_number: invoiceNumber,
        status: invoiceData.status || 'draft',
        amount: invoiceData.amount,
        currency: invoiceData.currency || 'USD',
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        items: invoiceData.items || [],
        notes: invoiceData.notes,
        created_by: user.id
      })
      .select()
      .single();

    if (error) return { data: null, error };

    return { data, error: null };
  },

  // Get client statistics
  async getClientStats(): Promise<{ data: ClientStats | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('status, total_value');

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('budget');

    if (clientsError || projectsError) {
      return { data: null, error: clientsError || projectsError };
    }

    const stats: ClientStats = {
      totalClients: clients?.length || 0,
      activeClients: clients?.filter(c => c.status === 'active').length || 0,
      prospectClients: clients?.filter(c => c.status === 'prospect').length || 0,
      totalValue: clients?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0,
      averageProjectValue: projects && projects.length > 0 
        ? projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length 
        : 0,
      clientRetentionRate: 85 // This would be calculated based on historical data
    };

    return { data: stats, error: null };
  },

  // Assign client to user
  async assignClientToUser(clientId: string, userId: string, reason?: string): Promise<{ data: any; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the target user's default workspace
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('default_workspace_id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser.default_workspace_id) {
      return { data: null, error: userError || { message: 'Target user has no default workspace' } };
    }

    // Create client assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('client_assignments')
      .insert({
        client_id: clientId,
        user_id: userId,
        assigned_by: currentUser.id,
        assignment_reason: reason || 'Manual assignment'
      })
      .select()
      .single();

    if (assignmentError) {
      return { data: null, error: assignmentError };
    }

    // Update client's workspace_id to the target user's default workspace
    const { error: updateError } = await supabase
      .from('clients')
      .update({ workspace_id: targetUser.default_workspace_id })
      .eq('id', clientId);

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Log the activity
    await userService.logActivity('client_assigned', 'client', clientId, {
      assignedTo: userId,
      assignedBy: currentUser.id,
      reason: reason
    });

    return { data: assignment, error: null };
  },

  // Share client with user (add to memberships)
  async shareClientWithUser(clientId: string, userId: string): Promise<{ data: any; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get client's workspace
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('workspace_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client.workspace_id) {
      return { data: null, error: clientError || { message: 'Client has no workspace' } };
    }

    // Add user to client's workspace as a member
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        workspace_id: client.workspace_id,
        role: 'member'
      })
      .select()
      .single();

    if (membershipError) {
      // Check if it's a unique constraint violation (user already a member)
      if (membershipError.code === '23505') {
        // User is already a member, which is fine
        return { data: { message: 'User is already a member of this workspace' }, error: null };
      }
      return { data: null, error: membershipError };
    }

    // Log the activity
    await userService.logActivity('client_shared', 'client', clientId, {
      sharedWith: userId,
      sharedBy: currentUser.id,
      workspaceId: client.workspace_id
    });

    return { data: membership, error: null };
  }
};