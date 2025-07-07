import { pool } from '../config/database.js';

// Helper function to handle database errors
const handleDatabaseError = (error, res) => {
  console.error('Database error:', error);
  return res.status(500).json({
    status: 'error',
    message: 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const createEvent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      name, 
      description, 
      location, 
      ticket_quantity, 
      ticket_price, 
      start_date, 
      end_date,
      ticketTypes = [],
      image_data_url
    } = req.body;

    // Validate required fields
    const requiredFields = { name, description, location, start_date, end_date };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        fields: missingFields
      });
    }

    // Validate at least one ticket type if no direct ticket info provided
    if ((!ticket_quantity || !ticket_price) && (!ticketTypes || ticketTypes.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Either provide ticket_quantity and ticket_price or at least one ticket type'
      });
    }

    // Validate image if provided
    if (image_data_url) {
      if (!image_data_url.startsWith('data:image/')) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid image format. Must be a data URL starting with data:image/'
        });
      }
      
      // Validate image size (max 2MB)
      const base64Data = image_data_url.split(',')[1];
      const imageSize = (base64Data.length * 3) / 4 - (base64Data.endsWith('==') ? 2 : 1);
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (imageSize > maxSize) {
        return res.status(400).json({
          status: 'error',
          message: 'Image size exceeds maximum allowed size of 2MB'
        });
      }
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'End date must be after start date'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    try {
      // Insert event
      const eventResult = await client.query(
        `INSERT INTO events (
          name, 
          description, 
          location, 
          start_date, 
          end_date, 
          image_url,
          organizer_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          name,
          description,
          location,
          start_date,
          end_date,
          image_data_url || null,
          req.user.id,
          'draft'
        ]
      );

      const event = eventResult.rows[0];
      
      // Handle ticket types
      if (ticketTypes && ticketTypes.length > 0) {
        // Insert multiple ticket types
        for (const ticketType of ticketTypes) {
          const { name, description, price, quantity, sales_start_date, sales_end_date } = ticketType;
          
          // Validate ticket type
          if (!name || !price || !quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              status: 'error',
              message: 'Each ticket type must have a name, price, and quantity'
            });
          }
          
          // Insert ticket type
          await client.query(
            `INSERT INTO ticket_types (
              event_id,
              name,
              description,
              price,
              quantity,
              sales_start_date,
              sales_end_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              event.id,
              name,
              description || null,
              parseFloat(price),
              parseInt(quantity, 10),
              sales_start_date || start_date,
              sales_end_date || end_date
            ]
          );
        }
      } else {
        // Insert default ticket type
        await client.query(
          `INSERT INTO ticket_types (
            event_id,
            name,
            description,
            price,
            quantity,
            sales_start_date,
            sales_end_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.id,
            'General Admission',
            'General admission ticket',
            parseFloat(ticket_price),
            parseInt(ticket_quantity, 10),
            start_date,
            end_date
          ]
        );
      }

      // Commit transaction
      await client.query('COMMIT');

      res.status(201).json({
        status: 'success',
        data: {
          event: {
            id: event.id,
            name: event.name,
            description: event.description,
            location: event.location,
            start_date: event.start_date,
            end_date: event.end_date,
            image_url: event.image_url,
            status: event.status,
            created_at: event.created_at,
            updated_at: event.updated_at
          }
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Create event error:', error);
    
    // Generic error response
    const errorResponse = {
      status: 'error',
      message: error.message || 'An error occurred while creating the event'
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = error.message;
      errorResponse.stack = error.stack;
    }
    
    return res.status(500).json(errorResponse);
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
};

/**
 * Get a single event by ID for an organizer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getEvent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Get the event with ticket types
    const query = `
      SELECT 
        e.*,
        json_agg(
          json_build_object(
            'id', tt.id,
            'name', tt.name,
            'description', tt.description,
            'price', tt.price,
            'quantity', tt.quantity,
            'sales_start_date', tt.sales_start_date,
            'sales_end_date', tt.sales_end_date,
            'created_at', tt.created_at,
            'updated_at', tt.updated_at,
            'available_quantity', tt.quantity - COALESCE((
              SELECT COUNT(*) 
              FROM tickets t 
              WHERE t.ticket_type_id = tt.id
            ), 0),
            'sold_quantity', (
              SELECT COUNT(*) 
              FROM tickets t 
              WHERE t.ticket_type_id = tt.id
            )
          )
        ) as ticket_types
      FROM events e
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      WHERE e.id = $1 AND e.organizer_id = $2
      GROUP BY e.id`;

    const result = await client.query(query, [id, organizerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found or you do not have permission to view it'
      });
    }

    const event = result.rows[0];
    
    // Format the response
    const response = {
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      start_date: event.start_date,
      end_date: event.end_date,
      status: event.status,
      image_url: event.image_url,
      created_at: event.created_at,
      updated_at: event.updated_at,
      ticket_types: event.ticket_types[0] ? event.ticket_types : []
    };

    res.status(200).json({
      status: 'success',
      data: {
        event: response
      }
    });

  } catch (error) {
    console.error('Get event error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the event',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
};

/**
 * Get events with statistics for the organizer's dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// Get all events for an organizer
export const getOrganizerEvents = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { status, page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const organizerId = req.user.id;
    
    let query = `
      SELECT e.*, 
             COUNT(DISTINCT t.id) as ticket_count,
             COUNT(DISTINCT o.id) as order_count,
             COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM events e
      LEFT JOIN tickets t ON e.id = t.event_id
      LEFT JOIN orders o ON t.order_id = o.id
      WHERE e.organizer_id = $1
    `;
    
    const queryParams = [organizerId];
    let paramCount = 2;
    
    if (status) {
      query += ` AND e.status = $${paramCount++}`;
      queryParams.push(status);
    }
    
    if (search) {
      query += ` AND (e.name ILIKE $${paramCount++} OR e.description ILIKE $${paramCount})`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    query += `
      GROUP BY e.id
      ORDER BY e.start_date DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM events WHERE organizer_id = $1';
    const countParams = [organizerId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    
    if (search) {
      countQuery += ` AND (name ILIKE $${status ? '3' : '2'} OR description ILIKE $${status ? '3' : '2'})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.status(200).json({
      status: 'success',
      data: {
        events: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting organizer events:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve events',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get upcoming events (public)
export const getUpcomingEvents = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, search = '', category } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, 
             o.name as organizer_name,
             o.image_url as organizer_image,
             COUNT(DISTINCT t.id) as ticket_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      LEFT JOIN tickets t ON e.id = t.event_id
      WHERE e.status = 'published'
      AND e.start_date > NOW()
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    if (search) {
      query += ` AND (e.name ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }
    
    if (category) {
      query += ` AND e.category = $${paramCount}`;
      queryParams.push(category);
      paramCount++;
    }
    
    // Group by and order
    query += `
      GROUP BY e.id, o.id
      ORDER BY e.start_date ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT e.id)
      FROM events e
      WHERE e.status = 'published'
      AND e.start_date > NOW()
    `;
    
    const countParams = [];
    paramCount = 1;
    
    if (search) {
      countQuery += ` AND (e.name ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
      paramCount++;
    }
    
    if (category) {
      countQuery += ` AND e.category = $${paramCount}`;
      countParams.push(category);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.status(200).json({
      status: 'success',
      data: {
        events: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve upcoming events',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get ticket types for an event
export const getEventTicketTypes = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { eventId } = req.params;
    
    // First check if event exists and is published
    const eventCheck = await client.query(
      'SELECT id, status FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }
    
    // Get ticket types
    const result = await client.query(
      `SELECT id, name, description, price, quantity_available, 
              sales_start_date, sales_end_date, is_active
       FROM ticket_types 
       WHERE event_id = $1
       ORDER BY price ASC`,
      [eventId]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        ticketTypes: result.rows
      }
    });
  } catch (error) {
    console.error('Error getting event ticket types:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve ticket types',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get public event details
export const getPublicEvent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { eventId } = req.params;
    
    // Get event details
    const eventResult = await client.query(
      `SELECT e.*, 
              o.name as organizer_name,
              o.description as organizer_description,
              o.image_url as organizer_image,
              o.website as organizer_website
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       WHERE e.id = $1 AND e.status = 'published'`,
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found or not published'
      });
    }
    
    const event = eventResult.rows[0];
    
    // Get ticket types
    const ticketTypesResult = await client.query(
      `SELECT id, name, description, price, quantity_available,
              sales_start_date, sales_end_date, is_active
       FROM ticket_types 
       WHERE event_id = $1 AND is_active = true
       ORDER BY price ASC`,
      [eventId]
    );
    
    // Get total tickets sold
    const ticketsSoldResult = await client.query(
      `SELECT COUNT(*) as total_sold
       FROM tickets t
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE tt.event_id = $1`,
      [eventId]
    );
    
    const totalTicketsSold = parseInt(ticketsSoldResult.rows[0]?.total_sold) || 0;
    
    // Calculate available tickets
    const availableTickets = Math.max(0, event.ticket_quantity - totalTicketsSold);
    
    // Prepare response
    const response = {
      ...event,
      ticket_types: ticketTypesResult.rows,
      stats: {
        total_tickets: event.ticket_quantity,
        tickets_sold: totalTicketsSold,
        tickets_available: availableTickets,
        percentage_sold: event.ticket_quantity > 0 
          ? Math.round((totalTicketsSold / event.ticket_quantity) * 100) 
          : 0
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    console.error('Error getting public event:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve event details',
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const getDashboardEvents = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const organizerId = req.user?.id;
    
    if (!organizerId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Get events with ticket statistics
    const query = `
      SELECT 
        e.id,
        e.name,
        e.description,
        e.location,
        e.start_date,
        e.end_date,
        e.status,
        e.image_url,
        e.created_at,
        e.updated_at,
        COALESCE(SUM(tt.quantity), 0) as total_tickets,
        COALESCE(SUM(tt.price * tt.quantity), 0) as potential_revenue,
        COALESCE(SUM(tt.quantity) - COALESCE(SUM(t.sold_count), 0), SUM(tt.quantity)) as available_tickets,
        COALESCE(SUM(t.sold_count), 0) as sold_tickets,
        COALESCE(SUM(t.sold_count * tt.price), 0) as earned_revenue
      FROM events e
      LEFT JOIN ticket_types tt ON e.id = tt.event_id
      LEFT JOIN (
        SELECT 
          ticket_type_id, 
          COUNT(*) as sold_count
        FROM tickets 
        GROUP BY ticket_type_id
      ) t ON tt.id = t.ticket_type_id
      WHERE e.organizer_id = $1
      GROUP BY e.id
      ORDER BY e.start_date DESC`;

    const result = await client.query(query, [organizerId]);
    
    // Format the response
    const events = result.rows.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      start_date: event.start_date,
      end_date: event.end_date,
      status: event.status,
      image_url: event.image_url,
      created_at: event.created_at,
      updated_at: event.updated_at,
      stats: {
        total_tickets: parseInt(event.total_tickets, 10),
        available_tickets: parseInt(event.available_tickets, 10),
        sold_tickets: parseInt(event.sold_tickets, 10),
        potential_revenue: parseFloat(event.potential_revenue),
        earned_revenue: parseFloat(event.earned_revenue)
      }
    }));

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        events
      }
    });

  } catch (error) {
    console.error('Get dashboard events error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching dashboard events',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
};

/**
 * Delete an event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// Update an event
export const updateEvent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const organizerId = req.user.id;
    const {
      name,
      description,
      location,
      start_date,
      end_date,
      status,
      image_data_url
    } = req.body;
    
    // Check if event exists and belongs to the organizer
    const eventCheck = await client.query(
      'SELECT * FROM events WHERE id = $1 AND organizer_id = $2',
      [id, organizerId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found or you do not have permission to update it'
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const queryParams = [];
    let paramCount = 1;
    
    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      queryParams.push(name);
    }
    
    if (description) {
      updateFields.push(`description = $${paramCount++}`);
      queryParams.push(description);
    }
    
    if (location) {
      updateFields.push(`location = $${paramCount++}`);
      queryParams.push(location);
    }
    
    if (start_date) {
      updateFields.push(`start_date = $${paramCount++}`);
      queryParams.push(start_date);
    }
    
    if (end_date) {
      updateFields.push(`end_date = $${paramCount++}`);
      queryParams.push(end_date);
    }
    
    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      queryParams.push(status);
    }
    
    if (image_data_url) {
      updateFields.push(`image_url = $${paramCount++}`);
      queryParams.push(image_data_url);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add event ID to query params
    queryParams.push(id);
    
    const query = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, queryParams);
    
    res.status(200).json({
      status: 'success',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update event',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Update event status
export const updateEventStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizerId = req.user.id;
    
    if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be one of: draft, published, cancelled, completed'
      });
    }
    
    // Check if event exists and belongs to the organizer
    const eventCheck = await client.query(
      'SELECT * FROM events WHERE id = $1 AND organizer_id = $2',
      [id, organizerId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found or you do not have permission to update it'
      });
    }
    
    // Update status
    const result = await client.query(
      `UPDATE events 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update event status',
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const deleteEvent = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // First, check if the event exists and belongs to the organizer
    const eventResult = await client.query(
      'SELECT id, organizer_id FROM events WHERE id = $1',
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    // Check if the authenticated user is the organizer of the event
    if (event.organizer_id !== organizerId) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this event'
      });
    }

    // Delete related records first to maintain referential integrity
    await client.query('DELETE FROM ticket_types WHERE event_id = $1', [id]);
    
    // Delete the event
    await client.query('DELETE FROM events WHERE id = $1', [id]);
    
    // Commit the transaction
    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully'
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Delete event error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the event',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
};
