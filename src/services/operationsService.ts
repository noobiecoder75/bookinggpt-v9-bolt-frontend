import { supabase } from '../lib/supabase';
import { BookingOperation, BookingNotification, OperationType, OperationStatus, NotificationType, NotificationPriority } from '../types/booking';

export class OperationsService {
  
  // Fetch all operations with filters
  static async getOperations(filters?: {
    status?: OperationStatus;
    type?: OperationType;
    dateRange?: { start: string; end: string };
    priority?: NotificationPriority;
  }) {
    let query = supabase
      .from('booking_operations')
      .select(`
        *,
        booking:bookings (
          booking_reference,
          travel_start_date,
          customer:customers (
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('operation_status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('operation_type', filters.type);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BookingOperation[];
  }

  // Create a new operation
  static async createOperation(operation: {
    booking_id: number;
    operation_type: OperationType;
    reason: string;
    original_details?: any;
    new_details?: any;
    change_fee?: number;
    refund_amount?: number;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('booking_operations')
      .insert({
        ...operation,
        operation_status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for new operation
    await this.createNotification({
      booking_id: operation.booking_id,
      notification_type: 'change_request',
      title: `New ${operation.operation_type.replace('_', ' ')} Request`,
      message: `A new ${operation.operation_type} has been requested: ${operation.reason}`,
      priority: operation.operation_type === 'cancellation' ? 'high' : 'normal'
    });

    return data;
  }

  // Update operation status
  static async updateOperationStatus(
    operationId: number, 
    status: OperationStatus, 
    notes?: string
  ) {
    const updateData: any = {
      operation_status: status,
      notes
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('booking_operations')
      .update(updateData)
      .eq('id', operationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get notifications with filters
  static async getNotifications(filters?: {
    unreadOnly?: boolean;
    priority?: NotificationPriority;
    type?: NotificationType;
    limit?: number;
  }) {
    let query = supabase
      .from('booking_notifications')
      .select(`
        *,
        booking:bookings (
          booking_reference,
          customer:customers (
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.type) {
      query = query.eq('notification_type', filters.type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BookingNotification[];
  }

  // Create notification
  static async createNotification(notification: {
    booking_id: number;
    notification_type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    metadata?: any;
  }) {
    const { data, error } = await supabase
      .from('booking_notifications')
      .insert({
        ...notification,
        priority: notification.priority || 'normal'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Mark notification as read
  static async markNotificationRead(notificationId: number) {
    const { data, error } = await supabase
      .from('booking_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get operations statistics
  static async getOperationsStats() {
    const { data: operations, error } = await supabase
      .from('booking_operations')
      .select('operation_status, operation_type, created_at');

    if (error) throw error;

    const stats = {
      total: operations?.length || 0,
      pending: operations?.filter(op => op.operation_status === 'pending').length || 0,
      processing: operations?.filter(op => op.operation_status === 'processing').length || 0,
      completed: operations?.filter(op => op.operation_status === 'completed').length || 0,
      failed: operations?.filter(op => op.operation_status === 'failed').length || 0,
      byType: {
        airline_change: operations?.filter(op => op.operation_type === 'airline_change').length || 0,
        customer_change: operations?.filter(op => op.operation_type === 'customer_change').length || 0,
        cancellation: operations?.filter(op => op.operation_type === 'cancellation').length || 0,
        rebook: operations?.filter(op => op.operation_type === 'rebook').length || 0,
      },
      thisWeek: operations?.filter(op => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(op.created_at) > weekAgo;
      }).length || 0
    };

    return stats;
  }

  // Simulate airline schedule change detection
  static async detectAirlineChanges(bookingId: number) {
    // This would integrate with Amadeus Schedule Change API in production
    // For now, simulate some changes
    const mockChanges = [
      {
        flight: 'AA123',
        original_time: '10:00',
        new_time: '11:30',
        change_type: 'schedule_change',
        reason: 'Weather delay'
      }
    ];

    // Create operations for detected changes
    for (const change of mockChanges) {
      await this.createOperation({
        booking_id: bookingId,
        operation_type: 'airline_change',
        reason: `Flight ${change.flight}: ${change.reason}`,
        original_details: { 
          flight: change.flight, 
          departure_time: change.original_time 
        },
        new_details: { 
          flight: change.flight, 
          departure_time: change.new_time 
        }
      });
    }

    return mockChanges;
  }

  // Handle customer change request
  static async handleCustomerChangeRequest(request: {
    booking_id: number;
    change_type: 'date_change' | 'passenger_change' | 'destination_change' | 'upgrade';
    details: any;
    customer_notes?: string;
  }) {
    return await this.createOperation({
      booking_id: request.booking_id,
      operation_type: 'customer_change',
      reason: `Customer requested ${request.change_type.replace('_', ' ')}`,
      new_details: request.details,
      notes: request.customer_notes
    });
  }
} 