import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Custom hook for real-time ticket updates
export const useRealTimeTickets = (eventId) => {
  const [ticketData, setTicketData] = useState({
    availableTickets: 0,
    registrations: 0,
    ticketCount: 0,
    isSoldOut: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const eventRef = doc(db, 'events', eventId);
    
    const unsubscribe = onSnapshot(
      eventRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const newTicketData = {
            availableTickets: data.availableTickets || 0,
            registrations: data.registrations || 0,
            ticketCount: data.ticketCount || 0,
            isSoldOut: (data.availableTickets || 0) <= 0
          };
          setTicketData(newTicketData);
          setError(null);
        } else {
          setError('Event not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to ticket updates:', error);
        setError('Failed to load ticket data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  return { ticketData, loading, error };
};

// Hook for real-time event list updates
export const useRealTimeEvents = (userId = null, role = null) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const setupListener = async () => {
      try {
        const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
        
        let eventsQuery;
        
        if (role === 'super_admin') {
          // Super admin sees all events
          eventsQuery = query(
            collection(db, 'events'),
            orderBy('createdAt', 'desc')
          );
        } else if (userId) {
          // Temp admin sees only their events
          eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
          );
        } else {
          setEvents([]);
          setLoading(false);
          return;
        }

        unsubscribe = onSnapshot(
          eventsQuery,
          (snapshot) => {
            const eventsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              isSoldOut: (doc.data().availableTickets || 0) <= 0
            }));
            setEvents(eventsList);
            setError(null);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to events:', error);
            setError('Failed to load events');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up events listener:', error);
        setError('Failed to initialize events listener');
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, role]);

  return { events, loading, error };
};

// Hook for real-time registration updates
export const useRealTimeRegistrations = (eventId) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const setupListener = async () => {
      try {
        const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
        
        const registrationsQuery = query(
          collection(db, 'registrations'),
          where('eventId', '==', eventId),
          orderBy('registeredAt', 'desc')
        );

        const unsubscribe = onSnapshot(
          registrationsQuery,
          (snapshot) => {
            const registrationsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRegistrations(registrationsList);
            setError(null);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to registrations:', error);
            setError('Failed to load registrations');
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up registrations listener:', error);
        setError('Failed to initialize registrations listener');
        setLoading(false);
      }
    };

    setupListener();
  }, [eventId]);

  return { registrations, loading, error };
};
