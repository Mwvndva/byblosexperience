import axios from 'axios';

async function testUpcomingEvents() {
  try {
    const apiUrl = 'http://localhost:3002/api/events/public/upcoming';
    console.log(`Testing API endpoint: GET ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      params: { limit: 10 },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Add timeout to prevent hanging
      timeout: 10000
    });
    
    console.log('\nAPI Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    
    if (Array.isArray(response.data)) {
      console.log(`\nReceived ${response.data.length} events:`);
      response.data.forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log('ID:', event.id);
        console.log('Name:', event.name);
        console.log('Start Date:', event.start_date);
        console.log('End Date:', event.end_date);
        console.log('Available Tickets:', event.available_tickets);
        console.log('Ticket Types:', event.ticket_types ? event.ticket_types.length : 0);
      });
    } else {
      console.log('Unexpected response format:', response.data);
    }
    
  } catch (error) {
    console.error('\nError calling API:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        params: error.config?.params
      }
    });
  }
}

testUpcomingEvents();
