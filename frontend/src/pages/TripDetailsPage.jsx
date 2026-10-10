import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Calendar, Clock, Edit3, Trash2, 
  Sparkles, ArrowLeft, Wand2, Download, Tag, CheckCircle2 
} from 'lucide-react';
import { getTripById, deleteTrip, generateItinerary, updateItinerary } from '../services/api';
import { downloadItineraryPDF } from '../utils/pdfExport';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { toast } from 'react-hot-toast';

const RupeeIcon = ({ size = 13, color = 'currentColor' }) => (
  <span style={{ fontSize: `${size}px`, fontWeight: 700, color, display: 'inline-block', lineHeight: 1 }}>₹</span>
);

const TripDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [updating, setUpdating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null); // null = show all days

  useEffect(() => {
    fetchTripDetails();
  }, [id]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      const res = await getTripById(id);
      setTrip(res.data);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to load trip details';
      toast.error(msg);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteTrip(id);
      toast.success('Trip deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete trip';
      toast.error(msg);
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleGenerateItinerary = async () => {
    try {
      setGenerating(true);
      const res = await generateItinerary({ tripId: id });
      setTrip(prev => ({ ...prev, itinerary: res.data.itinerary }));
      toast.success('Itinerary generated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to generate itinerary';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateItinerary = async () => {
    if (!editInstruction.trim()) {
      toast.error('Please enter an instruction before updating.');
      return;
    }
    try {
      setUpdating(true);
      const res = await updateItinerary({ tripId: id, instruction: editInstruction.trim() });
      setTrip(prev => ({ ...prev, itinerary: res.data.itinerary }));
      setEditInstruction('');
      toast.success('Itinerary updated successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update itinerary';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!trip?.itinerary || !trip.itinerary.days || trip.itinerary.days.length === 0) {
      toast.error('No itinerary available to export. Generate one first.');
      return;
    }
    try {
      setDownloadingPDF(true);
      downloadItineraryPDF(trip);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to generate PDF.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Days list with item counts & daily total costs
  const daysSummary = useMemo(() => {
    if (!trip?.itinerary?.days) return [];
    return trip.itinerary.days.map((day) => {
      const activities = day.activities || [];
      const totalCost = activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
      return {
        dayNum: day.day,
        date: day.date,
        itemCount: activities.length,
        totalCost,
        activities
      };
    });
  }, [trip]);

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-xl))' }}>
        <Loader size="large" text="Opening your travel dossier..." />
      </div>
    );
  }

  if (!trip) return null;

  const totalCost = trip.itinerary?.totalEstimatedCost || 0;
  const budgetNum = Number(trip.budget || 0);
  const percentUsed = budgetNum > 0 ? Math.min(Math.round((totalCost / budgetNum) * 100), 100) : 0;
  const remainingBudget = budgetNum - totalCost;
  const currencyCode = trip.currency || 'INR';
  const currencySymbol = currencyCode === 'INR' ? '₹' : `${currencyCode} `;

  const visibleDays = (activeDayIndex !== null && trip.itinerary?.days)
    ? [trip.itinerary.days[activeDayIndex]]
    : (trip.itinerary?.days || []);

  return (
    <div className="page-container" style={{ paddingTop: 'calc(var(--navbar-height) + var(--space-lg))', paddingBottom: 'var(--space-3xl)' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
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
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* ── Editorial Masthead ─────────────────────────────────── */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="duration-badge">
                {trip.duration} Days Journey
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </span>
            </div>
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 8px 0' }}>
              {trip.destination}
            </h1>
            <div className="interests-list">
              {trip.interests && trip.interests.map((interest, idx) => (
                <span key={idx} className="interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
            >
              {downloadingPDF ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button
              variant="secondary"
              icon={Edit3}
              onClick={() => navigate(`/trips/${id}/edit`)}
            >
              Edit Trip
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setShowConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ── State: No Itinerary Yet ───────────────────────────── */}
      {!trip.itinerary && (
        <div
          className="card"
          style={{
            padding: 'var(--space-2xl)',
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto'
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-md) auto'
          }}>
            <Sparkles size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', marginBottom: '8px' }}>
            Curate Your AI Itinerary
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto var(--space-xl) auto' }}>
            Generate a personalized, day-by-day travel schedule tailored to your {trip.duration}-day stay in {trip.destination}, taking your budget and interests into account.
          </p>
          <Button
            variant="primary"
            icon={Sparkles}
            onClick={handleGenerateItinerary}
            disabled={generating}
            className="btn-lg"
          >
            {generating ? 'Crafting Itinerary...' : 'Generate Itinerary'}
          </Button>
        </div>
      )}

      {/* ── State: 3-Column Editorial Layout ─────────────────── */}
      {trip.itinerary && (
        <div className="editorial-layout">
          {/* ── Left Column: Days Navigation ─────────────────── */}
          <div className="editorial-col-left">
            <div className="days-nav-panel">
              <div className="days-nav-header">
                Trip Itinerary ({trip.itinerary.days?.length || 0} Days)
              </div>

              <div className="days-nav-list">
                <button
                  className={`day-nav-item ${activeDayIndex === null ? 'active' : ''}`}
                  onClick={() => setActiveDayIndex(null)}
                >
                  <div className="day-nav-num" style={{ fontSize: '18px' }}>ALL</div>
                  <div className="day-nav-info">
                    <span className="day-nav-date">Full Itinerary</span>
                    <span className="day-nav-meta">{trip.itinerary.days?.length || 0} Days Combined</span>
                  </div>
                </button>

                {daysSummary.map((d, idx) => (
                  <button
                    key={idx}
                    className={`day-nav-item ${activeDayIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveDayIndex(idx)}
                  >
                    <div className="day-nav-num">
                      {String(d.dayNum).padStart(2, '0')}
                    </div>
                    <div className="day-nav-info">
                      <span className="day-nav-date">{formatShortDate(d.date)}</span>
                      <span className="day-nav-meta">
                        {d.itemCount} items • {d.totalCost > 0 ? `${currencySymbol}${d.totalCost.toLocaleString('en-IN')}` : 'Free'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Center Column: Timeline & Itinerary Details ── */}
          <div className="editorial-col-center">
            <div className="timeline-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-2xl)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {activeDayIndex !== null ? `Day ${daysSummary[activeDayIndex]?.dayNum}` : 'Complete Travel Schedule'}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Chronological timeline crafted by TripSync AI
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                  >
                    {downloadingPDF ? 'Downloading...' : 'PDF'}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Sparkles}
                    onClick={handleGenerateItinerary}
                    disabled={generating || updating}
                  >
                    {generating ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </div>
              </div>

              {visibleDays.map((day, dayIdx) => (
                <div key={dayIdx} className="day-section">
                  <div className="day-section-header">
                    <div>
                      <span className="day-section-title">Day {day.day}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>•</span>
                      <span className="day-section-date">{formatDate(day.date)}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {day.activities?.length || 0} activities
                    </span>
                  </div>

                  <div className="activity-stream">
                    {day.activities?.map((activity, actIdx) => (
                      <div key={actIdx} className="activity-box">
                        <div className="activity-dot" />

                        <div className="activity-box-header">
                          <h4 className="activity-name">{activity.name}</h4>
                          {activity.category && (
                            <span className="activity-cat-badge">
                              {activity.category}
                            </span>
                          )}
                        </div>

                        {activity.description && (
                          <p className="activity-desc">
                            {activity.description}
                          </p>
                        )}

                        <div className="activity-meta-row">
                          {(activity.startTime || activity.endTime) && (
                            <span className="activity-meta-item">
                              <Clock size={13} color="var(--text-muted)" />
                              {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
                            </span>
                          )}
                          {activity.location && (
                            <span className="activity-meta-item">
                              <MapPin size={13} color="var(--text-muted)" />
                              {activity.location}
                            </span>
                          )}
                          {typeof activity.estimatedCost === 'number' && (
                            <span className="activity-meta-item">
                              <RupeeIcon size={13} color="var(--accent-primary)" />
                              <strong>{currencySymbol}{activity.estimatedCost.toLocaleString('en-IN')}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Edit with AI Section ──────────────────────── */}
            <div className="ai-edit-panel">
              <div className="ai-edit-title">
                <Wand2 size={18} color="var(--accent-primary)" />
                <span>Refine Itinerary with AI</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Tell AI what to change and your itinerary will be revised naturally. Original data is safely backed up.
              </p>

              {/* Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-md)' }}>
                {[
                  'Make Day 2 less busy',
                  'Add more local food experiences',
                  'Reduce the estimated cost',
                  'Add more sightseeing',
                  'Add more free time'
                ].map((sug) => (
                  <button
                    key={sug}
                    className="suggestion-chip"
                    onClick={() => setEditInstruction(sug)}
                    disabled={updating}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                disabled={updating}
                placeholder="e.g., Replace the museum on Day 1 with a coastal walking tour, and suggest a vegetarian lunch spot."
                rows={3}
                className="input-field"
                style={{ resize: 'vertical', marginBottom: 'var(--space-md)' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  icon={Wand2}
                  onClick={handleUpdateItinerary}
                  disabled={updating || !editInstruction.trim()}
                >
                  {updating ? 'Updating Itinerary...' : 'Apply Revision'}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Right Column: Overview & Budget Breakdown ──── */}
          <div className="editorial-col-right">
            <div className="editorial-sidebar">
              {/* Spend Card */}
              <div className="sidebar-panel">
                <div className="sidebar-panel-title">Trip Spending</div>
                <div className="spend-row">
                  <span className="spend-label">Est. Itinerary Cost</span>
                  <span className="spend-value" style={{ color: 'var(--accent-primary)' }}>
                    {currencySymbol}{totalCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="spend-row">
                  <span className="spend-label">Budget</span>
                  <span className="spend-value">
                    {currencySymbol}{budgetNum.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${percentUsed}%`, backgroundColor: remainingBudget < 0 ? 'var(--status-error)' : 'var(--accent-primary)' }}
                  />
                </div>

                <div className="progress-caption">
                  <span>{percentUsed}% utilized</span>
                  <span style={{ color: remainingBudget < 0 ? 'var(--status-error)' : 'var(--text-secondary)' }}>
                    {remainingBudget >= 0
                      ? `${currencySymbol}${remainingBudget.toLocaleString('en-IN')} remaining`
                      : `${currencySymbol}${Math.abs(remainingBudget).toLocaleString('en-IN')} over`}
                  </span>
                </div>
              </div>

              {/* Trip Information */ }

              {/* Trip Notes / Location Insights */}
              <div className="sidebar-panel">
                <div className="sidebar-panel-title">Trip Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Destination:</strong> {trip.destination}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Duration:</strong> {trip.duration} Days ({daysSummary.length} days planned)
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Currency:</strong> {currencyCode}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Interests:</strong> {(trip.interests || []).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Deletion ─────────────────── */}
      {showConfirmDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(40, 38, 36, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ maxWidth: '420px', width: '90%', padding: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-xs)' }}>Delete Journey?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 'var(--space-lg)' }}>
              Are you sure you want to delete your trip to <strong>{trip.destination}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailsPage;
