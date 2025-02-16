import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plane, Building, Car, DollarSign, Plus, Trash2 } from 'lucide-react';

interface Service {
  id: string;
  type: string;
  name: string;
  cost: number;
  details: {
    day: number;
    [key: string]: any;
  };
}

interface Props {
  onServicesChange: (services: Service[]) => void;
  initialServices?: Service[];
  travelDates: {
    start: string;
    end: string;
  };
  travelers: {
    adults: number;
    children: number;
    seniors: number;
  };
}

export function QuoteServices({ onServicesChange, initialServices = [], travelDates, travelers }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    fetchAvailableServices();
  }, []);

  useEffect(() => {
    onServicesChange(services);
  }, [services]);

  async function fetchAvailableServices() {
    const { data: rates } = await supabase
      .from('rates')
      .select('*')
      .gte('valid_start', travelDates.start)
      .lte('valid_end', travelDates.end);

    if (rates) {
      setAvailableServices(rates);
    }
  }

  const days = travelDates.start && travelDates.end
    ? Math.ceil((new Date(travelDates.end).getTime() - new Date(travelDates.start).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  function handleDragEnd(result: any) {
    if (!result.destination) return;

    const items = Array.from(services);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setServices(items);
  }

  function addService(service: any) {
    const newService: Service = {
      id: `service-${Date.now()}`,
      type: service.rate_type,
      name: service.description,
      cost: service.cost,
      details: {
        day: selectedDay,
        ...service.details,
      },
    };

    setServices([...services, newService]);
  }

  function removeService(serviceId: string) {
    setServices(services.filter(s => s.id !== serviceId));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Services & Itinerary</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {Array.from({ length: days + 1 }, (_, i) => (
              <option key={i} value={i}>Day {i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Available Services */}
        <div className="col-span-1 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Available Services</h3>
            <div className="space-y-4">
              {availableServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer"
                  onClick={() => addService(service)}
                >
                  <div className="flex items-center">
                    {service.rate_type === 'Flight' && <Plane className="h-5 w-5 text-gray-400 mr-2" />}
                    {service.rate_type === 'Hotel' && <Building className="h-5 w-5 text-gray-400 mr-2" />}
                    {service.rate_type === 'Transfer' && <Car className="h-5 w-5 text-gray-400 mr-2" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.description}</p>
                      <p className="text-sm text-gray-500">${service.cost}</p>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Itinerary */}
        <div className="col-span-2 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Selected Services</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="services">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {services.map((service, index) => (
                      <Draggable key={service.id} draggableId={service.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center">
                              {service.type === 'Flight' && <Plane className="h-5 w-5 text-gray-400 mr-2" />}
                              {service.type === 'Hotel' && <Building className="h-5 w-5 text-gray-400 mr-2" />}
                              {service.type === 'Transfer' && <Car className="h-5 w-5 text-gray-400 mr-2" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                <p className="text-sm text-gray-500">
                                  Day {service.details.day + 1} • ${service.cost}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-gray-900">
                                ${(service.cost * (travelers.adults + travelers.children + travelers.seniors)).toLocaleString()}
                              </span>
                              <button
                                onClick={() => removeService(service.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>
    </div>
  );
}