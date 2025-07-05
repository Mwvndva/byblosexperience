import { pool } from '../config/database.js';

const Event = {
  async create({ 
    organizer_id, 
    name, 
    description, 
    image_url, 
    location, 
    ticket_quantity, 
    ticket_price, 
    start_date, 
    end_date 
  }) {
    const result = await pool.query(
      `INSERT INTO events 
       (organizer_id, name, description, image_url, location, ticket_quantity, ticket_price, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [organizer_id, name, description, image_url, location, ticket_quantity, ticket_price, start_date, end_date]
    );
    return result.rows[0];
  },

  async findById(id) {
    // Get the event
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    const event = eventResult.rows[0];
    
    if (!event) return null;
    
    // Get ticket types for the event with total_created count
    const ticketTypesResult = await pool.query(
      `WITH ticket_counts AS (
        SELECT 
          ticket_type_id,
          COUNT(*) as total_created
        FROM tickets
        WHERE event_id = $1
        GROUP BY ticket_type_id
      )
      SELECT 
        tt.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.ticket_type_id = tt.id AND t.status = 'paid') as sold,
        COALESCE(tc.total_created, 0) as total_created
      FROM ticket_types tt 
      LEFT JOIN ticket_counts tc ON tt.id = tc.ticket_type_id
      WHERE tt.event_id = $1`,
      [id]
    );
    
    // Add ticket types to the event object
    event.ticket_types = ticketTypesResult.rows;
    
    // Calculate total tickets sold and revenue from ticket types
    if (ticketTypesResult.rows.length > 0) {
      // If we have ticket types, use them for calculations
      event.total_tickets_sold = ticketTypesResult.rows.reduce((sum, tt) => sum + (parseInt(tt.quantity_sold || tt.sold || '0', 10)), 0);
      event.total_revenue = ticketTypesResult.rows.reduce(
        (sum, tt) => sum + ((parseInt(tt.quantity_sold || tt.sold || '0', 10)) * parseFloat(tt.price || 0)), 
        0
      );
      
      // Add ticket types to the event object with total_created
      event.ticket_types = ticketTypesResult.rows.map(tt => ({
        ...tt,
        quantity: parseInt(tt.quantity, 10) || 0,
        sold: parseInt(tt.quantity_sold || tt.sold || '0', 10),
        total_created: parseInt(tt.total_created || '0', 10),
        available: Math.max(0, (parseInt(tt.quantity, 10) || 0) - (parseInt(tt.quantity_sold || tt.sold || '0', 10)))
      }));
    } else {
      // Fallback to event-level ticket quantity if no ticket types exist
      event.total_tickets_sold = parseInt(event.tickets_sold || '0', 10);
      event.total_revenue = event.total_tickets_sold * parseFloat(event.ticket_price || 0);
      
      // Create a default ticket type if none exist
      event.ticket_types = [{
        id: 'default',
        name: 'General Admission',
        description: 'General admission ticket',
        price: parseFloat(event.ticket_price || 0),
        quantity: parseInt(event.ticket_quantity || '0', 10),
        sold: event.total_tickets_sold,
        total_created: event.total_tickets_sold, // For default ticket type, total_created is the same as sold
        available: Math.max(0, (parseInt(event.ticket_quantity || '0', 10) - event.total_tickets_sold)),
        sales_start_date: null,
        sales_end_date: null,
        is_default: true
      }];
    }
    
    return event;
  },

  async findByOrganizer(organizer_id) {
    const result = await pool.query(
      'SELECT * FROM events WHERE organizer_id = $1 ORDER BY created_at DESC',
      [organizer_id]
    );
    return result.rows;
  },

  async findUpcomingByOrganizer(organizer_id, limit = 10) {
    const result = await pool.query(
      `SELECT e.*, o.full_name as organizer_name 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       WHERE e.organizer_id = $1 
         AND e.end_date > NOW()
       ORDER BY e.start_date ASC
       LIMIT $2`,
      [organizer_id, limit]
    );
    return result.rows;
  },

  async findPastByOrganizer(organizer_id, limit = 10) {
    const result = await pool.query(
      `SELECT e.*, o.full_name as organizer_name 
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       WHERE e.organizer_id = $1 AND e.end_date <= NOW()
       ORDER BY e.end_date DESC
       LIMIT $2`,
      [organizer_id, limit]
    );
    return result.rows;
  },

  async update(id, updates) {
    const { 
      name, 
      description, 
      image_url, 
      location, 
      ticket_quantity, 
      ticket_price, 
      start_date, 
      end_date,
      status 
    } = updates;
    
    const result = await pool.query(
      `UPDATE events 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           location = COALESCE($4, location),
           ticket_quantity = COALESCE($5, ticket_quantity),
           ticket_price = COALESCE($6, ticket_price),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           status = COALESCE($9, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [name, description, image_url, location, ticket_quantity, ticket_price, 
       start_date, end_date, status, id]
    );
    
    return result.rows[0];
  },

  async delete(id, organizer_id) {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND organizer_id = $2 RETURNING id',
      [id, organizer_id]
    );
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE events 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status`,
      [status, id]
    );
    return result.rows[0];
  },

  async getUpcomingEvents(limit = 10) {
    // First get all upcoming events
    const result = await pool.query(
      `SELECT e.* FROM events e
       WHERE e.status = 'published' 
         AND e.start_date > NOW()
       ORDER BY e.start_date ASC
       LIMIT $1`,
      [limit]
    );

    const events = result.rows;
    if (events.length === 0) return [];
    
    // Get ticket types for all events
    const eventIds = events.map(e => e.id);
    const ticketTypesResult = await pool.query(
      `WITH type_counts AS (
        SELECT 
          t.ticket_type_id,
          t.event_id,
          COUNT(*) as sold_count,
          COALESCE(SUM(t.price), 0) as type_revenue
        FROM tickets t
        WHERE t.event_id = ANY($1)
          AND t.status = 'paid'
        GROUP BY t.ticket_type_id, t.event_id
      )
      SELECT 
        tt.*,
        COALESCE(tc.sold_count, 0) as sold,
        GREATEST(0, tt.quantity - COALESCE(tc.sold_count, 0)) as available,
        COALESCE(tc.type_revenue, 0) as revenue
      FROM ticket_types tt 
      LEFT JOIN type_counts tc ON tt.id = tc.ticket_type_id
      WHERE tt.event_id = ANY($1)
        AND (tt.sales_start_date IS NULL OR tt.sales_start_date <= NOW())
        AND (tt.sales_end_date IS NULL OR tt.sales_end_date >= NOW())
      ORDER BY tt.price ASC`,
      [eventIds]
    );
    
    // Group ticket types by event ID
    const ticketTypesByEvent = {};
    ticketTypesResult.rows.forEach(tt => {
      if (!ticketTypesByEvent[tt.event_id]) {
        ticketTypesByEvent[tt.event_id] = [];
      }
      ticketTypesByEvent[tt.event_id].push({
        ...tt,
        sold: parseInt(tt.sold || '0', 10),
        available: parseInt(tt.available || '0', 10),
        revenue: parseFloat(tt.revenue || '0')
      });
    });
    
    // Get ticket sales for events without ticket types
    const eventsWithoutTicketTypes = events.filter(e => !ticketTypesByEvent[e.id] || ticketTypesByEvent[e.id].length === 0);
    if (eventsWithoutTicketTypes.length > 0) {
      const eventIdsWithoutTypes = eventsWithoutTicketTypes.map(e => e.id);
      const ticketSalesResult = await pool.query(
        `SELECT 
          event_id,
          COUNT(*) as sold_count,
          COALESCE(SUM(price), 0) as total_revenue
        FROM tickets 
        WHERE event_id = ANY($1)
          AND status = 'paid'
        GROUP BY event_id`,
        [eventIdsWithoutTypes]
      );
      
      // Add default ticket types for events without ticket types
      ticketSalesResult.rows.forEach(sale => {
        const event = events.find(e => e.id === sale.event_id);
        if (event) {
          const sold = parseInt(sale.sold_count || '0', 10);
          const quantity = parseInt(event.ticket_quantity || '0', 10);
          const available = Math.max(0, quantity - sold);
          const revenue = parseFloat(sale.total_revenue || '0');
          
          ticketTypesByEvent[event.id] = [{
            id: 'default',
            event_id: event.id,
            name: 'General Admission',
            description: 'General admission ticket',
            price: parseFloat(event.ticket_price || '0'),
            quantity: quantity,
            sold: sold,
            available: available,
            revenue: revenue,
            sales_start_date: null,
            sales_end_date: null,
            is_default: true
          }];
        }
      });
    }
    
    // Update events with ticket types and calculated values
    events.forEach(event => {
      const ticketTypes = ticketTypesByEvent[event.id] || [];
      
      // Calculate totals from ticket types
      const totals = ticketTypes.reduce((acc, tt) => ({
        sold: acc.sold + (parseInt(tt.sold) || 0),
        available: acc.available + (parseInt(tt.available) || 0),
        revenue: acc.revenue + (parseFloat(tt.revenue) || 0)
      }), { sold: 0, available: 0, revenue: 0 });
      
      // Update event with calculated values
      event.ticket_types = ticketTypes;
      event.tickets_sold = totals.sold;
      event.available_tickets = totals.available;
      event.total_revenue = totals.revenue;
      
      // For backward compatibility, set ticket_quantity to the sum of ticket type quantities
      if (ticketTypes.length > 0) {
        event.ticket_quantity = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity) || 0), 0);
      }
      
      // Debug log
      console.log(`Event ${event.id} (${event.name}):`, {
        ticket_quantity: event.ticket_quantity,
        tickets_sold: event.tickets_sold,
        available_tickets: event.available_tickets,
        total_revenue: event.total_revenue,
        ticket_types: event.ticket_types.map(t => ({
          id: t.id,
          name: t.name,
          quantity: t.quantity,
          sold: t.sold,
          available: t.available,
          price: t.price
        }))
      });
    });
    
    return events;
  },
  
  async getPublicEvent(id) {
    // First get the basic event data
    const eventResult = await pool.query(
      `SELECT e.* FROM events e WHERE e.id = $1 AND e.status = 'published'`,
      [id]
    );

    const event = eventResult.rows[0];
    if (!event) return null;

    // Get ticket types with total created count
    const ticketTypesResult = await pool.query(
      `WITH ticket_counts AS (
        SELECT 
          ticket_type_id,
          COUNT(*) as total_created
        FROM tickets
        WHERE event_id = $1
        GROUP BY ticket_type_id
      )
      SELECT 
        tt.*,
        COALESCE(tc.total_created, 0) as total_created
      FROM ticket_types tt 
      LEFT JOIN ticket_counts tc ON tt.id = tc.ticket_type_id
      WHERE tt.event_id = $1 
        AND (tt.sales_start_date IS NULL OR tt.sales_start_date <= NOW())
        AND (tt.sales_end_date IS NULL OR tt.sales_end_date >= NOW())
      ORDER BY tt.price ASC`,
      [id]
    );
    
    const ticketTypes = ticketTypesResult.rows.map(tt => ({
      ...tt,
      quantity: parseInt(tt.quantity || '0', 10),
      total_created: parseInt(tt.total_created || '0', 10)
    }));
    
    // If no ticket types, use event-level ticket data
    if (ticketTypes.length === 0) {
      // Create a default ticket type
      ticketTypes.push({
        id: 'default',
        name: 'General Admission',
        description: 'General admission ticket',
        price: parseFloat(event.ticket_price || '0'),
        quantity: parseInt(event.ticket_quantity || '0', 10),
        available: parseInt(event.ticket_quantity || '0', 10),
        sales_start_date: null,
        sales_end_date: null,
        is_default: true
      });
    }
    
    // Update event with ticket types
    event.ticket_types = ticketTypes;
    event.available_tickets = ticketTypes.reduce((sum, tt) => sum + (parseInt(tt.quantity || '0', 10)), 0);
    
    // Debug log the event data
    console.log('Public event data:', {
      id: event.id,
      name: event.name,
      ticket_types: event.ticket_types.map(tt => ({
        id: tt.id,
        name: tt.name,
        quantity: tt.quantity,
        sold: tt.sold,
        available: tt.available,
        price: tt.price
      })),
      tickets_sold: event.tickets_sold,
      total_revenue: event.total_revenue,
      available_tickets: event.available_tickets
    });
    
    return event;
  },
  
  async getUpcomingEvents(limit = 10) {
    // First, get all upcoming events
    const eventsResult = await pool.query(
      `SELECT * FROM events 
       WHERE end_date >= NOW() 
         AND status = 'published'
       ORDER BY start_date ASC 
       LIMIT $1`,
      [limit]
    );
    
    const events = eventsResult.rows;
    if (events.length === 0) return [];
    
    // Get event IDs for batch loading ticket types
    const eventIds = events.map(e => e.id);
    
    // Get ticket types for all events in one query
    const ticketTypesResult = await pool.query(
      `WITH ticket_sales AS (
        SELECT 
          ticket_type_id,
          COUNT(*) as sold
        FROM tickets
        WHERE status = 'paid'
        GROUP BY ticket_type_id
      )
      SELECT 
        tt.*,
        COALESCE(ts.sold, 0) as sold,
        GREATEST(0, tt.quantity - COALESCE(ts.sold, 0)) as available
      FROM ticket_types tt
      LEFT JOIN ticket_sales ts ON tt.id = ts.ticket_type_id
      WHERE tt.event_id = ANY($1)
        AND (tt.sales_start_date IS NULL OR tt.sales_start_date <= NOW())
        AND (tt.sales_end_date IS NULL OR tt.sales_end_date >= NOW())
      ORDER BY tt.price ASC`,
      [eventIds]
    );
    
    // Group ticket types by event ID
    const ticketTypesByEvent = {};
    ticketTypesResult.rows.forEach(tt => {
      if (!ticketTypesByEvent[tt.event_id]) {
        ticketTypesByEvent[tt.event_id] = [];
      }
      ticketTypesByEvent[tt.event_id].push({
        id: tt.id,
        name: tt.name,
        description: tt.description,
        price: parseFloat(tt.price || '0'),
        quantity: parseInt(tt.quantity || '0', 10),
        sold: parseInt(tt.sold || '0', 10),
        available: parseInt(tt.available || '0', 10),
        sales_start_date: tt.sales_start_date,
        sales_end_date: tt.sales_end_date,
        is_default: false
      });
    });
    
    // Process events to include ticket types and calculate totals
    return events.map(event => {
      const ticketTypes = ticketTypesByEvent[event.id] || [];
      
      // If no ticket types, create a default one
      if (ticketTypes.length === 0) {
        ticketTypes.push({
          id: 'default',
          name: 'General Admission',
          description: 'General admission ticket',
          price: parseFloat(event.ticket_price || '0'),
          quantity: parseInt(event.ticket_quantity || '0', 10),
          sold: 0,
          available: parseInt(event.ticket_quantity || '0', 10),
          sales_start_date: null,
          sales_end_date: null,
          is_default: true
        });
      }
      
      // Calculate totals
      const totals = ticketTypes.reduce((acc, tt) => ({
        sold: acc.sold + (tt.sold || 0),
        available: acc.available + (tt.available || 0),
        revenue: acc.revenue + ((tt.sold || 0) * (tt.price || 0))
      }), { sold: 0, available: 0, revenue: 0 });
      
      return {
        ...event,
        ticket_types: ticketTypes,
        tickets_sold: totals.sold,
        available_tickets: totals.available,
        total_revenue: totals.revenue
      };
    });
  }
};

export default Event;
