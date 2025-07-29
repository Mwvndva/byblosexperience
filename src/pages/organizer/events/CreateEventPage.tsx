import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/components/events/EventForm';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

export default function CreateEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      
      // Convert image to base64 if present
      let imageDataUrl = '';
      if (formData.image) {
        imageDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(formData.image);
        });
      }

      // Ensure all ticket type values are properly converted to numbers
      const processedTicketTypes = formData.ticketTypes.map((type: any) => {
        // Ensure price is a number
        const price = typeof type.price === 'string' ? 
          parseFloat(type.price) || 0 : 
          Number(type.price) || 0;

        // Ensure quantity is an integer
        const quantity = typeof type.quantity === 'string' ? 
          parseInt(type.quantity, 10) || 1 : 
          Math.max(1, Math.floor(Number(type.quantity) || 1));

        return {
          name: type.name,
          price: price,
          quantity: quantity,
          description: type.description || '',
          salesStartDate: type.salesStartDate?.toISOString(),
          salesEndDate: type.salesEndDate?.toISOString()
        };
      });


      // Prepare the event data for the API
      const eventData = {
        name: formData.title,
        description: formData.description,
        location: formData.isOnline ? 'Online' : formData.venue,
        start_date: formData.startDate.toISOString(),
        end_date: formData.endDate.toISOString(),
        image_data_url: imageDataUrl,
        ticketTypes: processedTicketTypes
      };
      
      // Make the API request
      console.log('Submitting event data:', eventData);
      const response = await api.post('/organizers/events', eventData);
      
      if (response.data.status === 'success') {
        toast({
          title: 'Event created successfully!',
          description: 'Your event has been published.',
        });
        
        // Redirect to event list
        navigate('/organizer/events');
      } else {
        throw new Error(response.data.message || 'Failed to create event');
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create event. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/organizer/events')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
          <p className="text-muted-foreground">
            Fill in the details below to create your event
          </p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-sm border p-6">
        <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
