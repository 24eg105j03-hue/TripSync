import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, ArrowRight, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTrips } from '../services/api';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { toast } from 'react-hot-toast';

const RupeeIcon = ({ size = 15, color = 'currentColor' }) => (
  <span style={{ fontSize: `${size}px`, fontWeight: 700, color, display: 'inline-block', lineHeight: 1 }}>₹</span>
);

const getDestinationImage = (destination) => {
  const dest = (destination || '').toLowerCase();
  if (dest.includes('goa') || dest.includes('beach')) {
    return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80';
  }
  if (dest.includes('mumbai')) {
    return 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80';
  }
  if (dest.includes('paris')) {
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80';
  }
  if (dest.includes('tokyo') || dest.includes('japan')) {
    return 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80';
  }
  if (dest.includes('bali')) {
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80';
  }
  if (dest.includes('sedona') || dest.includes('arizona')) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await getTrips();
      setTrips(res.data || []);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load trips';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container dashboard-page">
        <Loader size="large" text="Curating your travel plans..." />
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome, {user?.name || 'Traveler'}</h1>
          <p className="dashboard-subtitle">Explore your bespoke travel plans and itineraries.</p>
        </div>
        <div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/trips/new')}
          >
            Plan New Journey
          </Button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Compass size={36} />
          </div>
          <h2 className="empty-state-title">No Journeys Planned Yet</h2>
          <p className="empty-state-text">
            Begin your next adventure by creating a personalized itinerary crafted around your dates, budget, and interests.
          </p>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/trips/new')}
          >
            Plan Your First Journey
          </Button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => {
            const photoUrl = getDestinationImage(trip.destination);
            return (
              <div
                key={trip._id}
                className="trip-card"
                onClick={() => navigate(`/trips/${trip._id}`)}
              >
                {/* Destination Photo Header */}
                <div style={{
                  height: '140px',
                  margin: '-24px -24px 18px -24px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img
                    src={photoUrl}
                    alt={trip.destination}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px'
                  }}>
                    <span className="duration-badge" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                      {trip.duration} Days
                    </span>
                  </div>
                </div>

                <div className="trip-card-header">
                  <div className="trip-destination">
                    <h3>{trip.destination}</h3>
                  </div>
                </div>

                <div className="trip-card-details">
                  <div className="trip-detail-item">
                    <Calendar size={15} color="var(--text-muted)" />
                    <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                  </div>
                  <div className="trip-detail-item">
                    <RupeeIcon size={15} color="var(--text-muted)" />
                    <span>Budget: ₹{Number(trip.budget).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="interests-list">
                  {trip.interests && trip.interests.map((interest, idx) => (
                    <span key={idx} className="interest-tag">
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="trip-card-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {trip.itinerary?.days?.length ? `${trip.itinerary.days.length} Days Generated` : 'Itinerary pending'}
                  </span>
                  <span className="view-details-btn">
                    View Itinerary <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
