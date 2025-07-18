import { query } from '../config/database.js';

const DashboardRepository = {
  // Get dashboard statistics for an organizer
  async getDashboardStats(organizerId) {
    const sql = `
      SELECT * FROM dashboard_stats 
      WHERE organizer_id = $1
    `;
    const { rows } = await query(sql, [organizerId]);
    return rows[0] || null;
  },

  // Get upcoming events for an organizer
  async getUpcomingEvents(organizerId, limit = 3) {
    const sql = `
      SELECT 
        e.*,
        o.full_name as organizer_name,
        o.email as organizer_email,
        (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status = 'paid') as tickets_sold
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE 
        e.organizer_id = $1 
        AND e.status = 'published'
        AND e.end_date > NOW()
      ORDER BY e.start_date ASC
      LIMIT $2
    `;
    const { rows } = await query(sql, [organizerId, limit]);
    return rows;
  },

  // Get recent sales for an organizer
  async getRecentSales(organizerId, limit = 4) {
    const sql = `
      SELECT 
        t.id,
        t.ticket_number as transaction_id,
        t.customer_name,
        t.customer_email,
        t.event_id,
        t.ticket_type_name as ticket_type,
        t.price as amount,
        t.status,
        t.created_at,
        e.name as event_title,
        e.start_date as event_date,
        1 as quantity
      FROM tickets t
      LEFT JOIN events e ON t.event_id = e.id
      WHERE t.organizer_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `;
    const { rows } = await query(sql, [organizerId, limit]);
    return rows;
  },

  // Update dashboard stats (to be called when events/tickets change)
  async updateDashboardStats(organizerId) {
    try {
      // Fix any invalid date ranges first
      await query(
        `UPDATE events 
         SET end_date = start_date + INTERVAL '2 hours'
         WHERE organizer_id = $1 
         AND (end_date <= start_date OR end_date IS NULL)`,
        [organizerId]
      );

      // Calculate all stats in a single query
      const { rows } = await query(`
        WITH event_counts AS (
          SELECT 
            COUNT(*) as total_events,
            COUNT(CASE WHEN start_date > NOW() THEN 1 END) as upcoming_events,
            COUNT(CASE WHEN end_date < NOW() THEN 1 END) as past_events,
            COUNT(CASE WHEN start_date <= NOW() AND end_date >= NOW() THEN 1 END) as current_events
          FROM events
          WHERE organizer_id = $1 
          AND status != 'cancelled'
        ),
        ticket_stats AS (
          SELECT 
            COUNT(*) as total_tickets_sold,
            COALESCE(SUM(price), 0) as total_revenue,
            COUNT(DISTINCT customer_email) as total_attendees
          FROM tickets
          WHERE organizer_id = $1 
          AND status = 'paid'
        )
        INSERT INTO dashboard_stats (
          organizer_id, 
          total_events, 
          upcoming_events, 
          past_events, 
          current_events,
          total_tickets_sold, 
          total_revenue, 
          total_attendees
        )
        SELECT 
          $1, 
          COALESCE(ec.total_events, 0),
          COALESCE(ec.upcoming_events, 0),
          COALESCE(ec.past_events, 0),
          COALESCE(ec.current_events, 0),
          COALESCE(ts.total_tickets_sold, 0),
          COALESCE(ts.total_revenue, 0),
          COALESCE(ts.total_attendees, 0)
        FROM 
          (SELECT 1) dummy
          LEFT JOIN event_counts ec ON true
          LEFT JOIN ticket_stats ts ON true
        ON CONFLICT (organizer_id) 
        DO UPDATE SET
          total_events = EXCLUDED.total_events,
          upcoming_events = EXCLUDED.upcoming_events,
          past_events = EXCLUDED.past_events,
          current_events = EXCLUDED.current_events,
          total_tickets_sold = EXCLUDED.total_tickets_sold,
          total_revenue = EXCLUDED.total_revenue,
          total_attendees = EXCLUDED.total_attendees,
          updated_at = NOW()
        RETURNING *`,
        [organizerId]
      );

      return rows[0];
    } catch (error) {
      console.error('Error updating dashboard stats:', error);
      throw error;
    }
  },

  // Record a new sale
  async recordSale(saleData) {
    const {
      organizer_id,
      transaction_id,
      customer_name,
      customer_email,
      event_id,
      ticket_type,
      quantity = 1,
      amount,
      status = 'paid'
    } = saleData;

    const sql = `
      INSERT INTO tickets (
        ticket_number,
        event_id,
        organizer_id,
        customer_name,
        customer_email,
        ticket_type_name,
        price,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    // Use the transaction_id as the ticket_number if provided, otherwise it will be auto-generated by the trigger
    const ticketNumber = transaction_id || `TEMP-${Date.now()}`;
    
    const { rows } = await query(sql, [
      ticketNumber,
      event_id,
      organizer_id,
      customer_name,
      customer_email,
      ticket_type,
      amount,
      status
    ]);

    // Update dashboard stats
    await this.updateDashboardStats(organizer_id);

    return rows[0];
  },

  // Update stats when a new event is created
  async addRecentEvent(organizerId) {
    return this.updateDashboardStats(organizerId);
  }
};

export default DashboardRepository;
