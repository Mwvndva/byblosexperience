import { pool } from '../config/database.js';

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
