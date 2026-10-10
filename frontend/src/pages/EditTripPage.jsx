import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ArrowLeft, Check } from 'lucide-react';
import { getTripById, updateTrip } from '../services/api';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { toast } from 'react-hot-toast';

const RupeeIcon = ({ size = 18, color = 'currentColor' }) => (
  <span style={{ fontSize: `${size}px`, fontWeight: 700, color, display: 'inline-block', lineHeight: 1 }}>₹</span>
);

const AVAILABLE_INTERESTS = [
  'Food & Drink',
  'Adventure & Outdoors',
  'Culture & History',
  'Relaxation & Wellness',
  'Entertainment & Nightlife',
  'Unique Experiences',
  'Other'
];

const EditTripPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'INR',
    interests: []
  });
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setFetching(true);
      const res = await getTripById(id);
      const trip = res.data;

      const formatDateForInput = (d) => {
        if (!d) return '';
        return new Date(d).toISOString().split('T')[0];
      };

      setFormData({
        destination: trip.destination || '',
        startDate: formatDateForInput(trip.startDate),
        endDate: formatDateForInput(trip.endDate),
        budget: trip.budget || '',
        currency: trip.currency || 'INR',
        interests: trip.interests || []
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load trip';
      toast.error(msg);
      navigate('/dashboard');
    } finally {
      setFetching(false);
    }
  };

  const calculatedDuration = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end < start) return -1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [formData.startDate, formData.endDate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.destination.trim()) {
      toast.error('Destination is required');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Dates are required');
      return;
    }
    if (calculatedDuration !== null && calculatedDuration < 1) {
      toast.error('End date cannot be before start date');
      return;
    }
    if (!formData.budget || Number(formData.budget) <= 0) {
      toast.error('Budget must be positive');
      return;
    }
    if (formData.interests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }

    try {
      setSaving(true);
      await updateTrip(id, {
        ...formData,
        budget: Number(formData.budget)
      });
      toast.success('Trip updated successfully!');
      navigate(`/trips/${id}`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update trip';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="page-container" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
        <Loader size="large" text="Loading journey details..." />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/trips/${id}`)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginBottom: 'var(--space-lg)',
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} /> Back to Itinerary
        </button>

        <div className="card" style={{ padding: 'var(--space-2xl)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-xs)' }}>
            Edit Journey Details
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 'var(--space-xl)' }}>
            Update destination, dates, budget, and travel preferences.
          </p>

          <form onSubmit={handleSubmit}>
            <Input
              label="Destination"
              type="text"
              name="destination"
              icon={MapPin}
              value={formData.destination}
              onChange={handleChange}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                icon={Calendar}
                value={formData.startDate}
                onChange={handleChange}
                required
              />
              <Input
                label="End Date"
                type="date"
                name="endDate"
                icon={Calendar}
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>

            {calculatedDuration !== null && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: calculatedDuration < 1 ? '#FDF3F1' : 'var(--accent-light)',
                  border: `1px solid ${calculatedDuration < 1 ? '#ECCEC5' : 'var(--accent-border)'}`,
                  color: calculatedDuration < 1 ? 'var(--status-error)' : 'var(--accent-primary)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-lg)'
                }}
              >
                {calculatedDuration < 1
                  ? 'End date cannot be before start date'
                  : `Updated Duration: ${calculatedDuration} Day${calculatedDuration > 1 ? 's' : ''}`}
              </div>
            )}

            <Input
              label="Budget (₹ INR)"
              type="number"
              name="budget"
              icon={RupeeIcon}
              value={formData.budget}
              onChange={handleChange}
              min="1"
              required
            />

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <label className="input-label">
                Select Interests (Choose at least 1)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {AVAILABLE_INTERESTS.map((interest) => {
                  const isSelected = formData.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card-subtle)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {isSelected && <Check size={13} />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={saving || (calculatedDuration !== null && calculatedDuration < 1)}
              className="btn-lg"
            >
              {saving ? 'Saving Revisions...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTripPage;
