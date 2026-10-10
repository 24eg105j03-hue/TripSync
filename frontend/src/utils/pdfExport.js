import { jsPDF } from 'jspdf';

/**
 * Format date nicely for the PDF report.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Safe currency formatter for jsPDF (ASCII/WinAnsi compliant).
 * Avoids raw unicode symbols like '₹' (U+20B9) which corrupt into superscript 1 ('¹') in standard jsPDF Helvetica.
 */
const formatCurrency = (amount, currency = 'INR') => {
  const num = Number(amount || 0).toLocaleString('en-IN');
  const curr = (currency || 'INR').toUpperCase();
  if (curr === 'INR') return `${num} INR`;
  if (curr === 'USD') return `$${num} USD`;
  if (curr === 'EUR') return `${num} EUR`;
  if (curr === 'GBP') return `${num} GBP`;
  return `${num} ${curr}`;
};

const formatShortCurrency = (amount, currency = 'INR') => {
  const num = Number(amount || 0).toLocaleString('en-IN');
  const curr = (currency || 'INR').toUpperCase();
  if (curr === 'INR') return `${num} INR`;
  if (curr === 'USD') return `$${num}`;
  return `${num} ${curr}`;
};

/**
 * Generate and download a PDF for a trip itinerary.
 * Uses the actual saved itinerary data from the trip object.
 *
 * @param {Object} trip - The trip object containing destination, dates, budget, interests, and itinerary.
 */
export const downloadItineraryPDF = (trip) => {
  if (!trip || !trip.itinerary) {
    throw new Error('No itinerary available to export. Generate one first.');
  }

  const days = trip.itinerary.days;
  if (!Array.isArray(days) || days.length === 0) {
    throw new Error('No itinerary days available to export. Generate an itinerary first.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 16;
  const marginR = 16;
  const contentW = pageW - marginL - marginR;
  const bottomMargin = 18;
  const topMarginContinuation = 18;

  let y = 0;

  // ── Palette ────────────────────────────────────────────────
  const primary       = [82, 122, 80];    // Rich Sage #527A50
  const primaryLight  = [233, 242, 232];  // Sage Light #E9F2E8
  const secondary     = [229, 138, 104];  // Warm Coral #E58A68
  const textDark      = [48, 59, 50];     // Deep Forest #303B32
  const textMuted     = [88, 99, 90];     // Dark Slate #58635A
  const borderLight   = [227, 216, 199];  // Sand #E3D8C7
  const cardBg        = [250, 247, 240];  // Warm Ivory #FAF7F0
  const white         = [255, 255, 255];

  // ── Pagination Helper ──────────────────────────────────────
  const ensureSpace = (neededHeight) => {
    if (y + neededHeight > pageH - bottomMargin) {
      doc.addPage();
      y = topMarginContinuation;

      // Continuation page header
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      const headerTitle = `${trip.destination || 'Trip'} — Itinerary (Continued)`;
      doc.text(headerTitle, marginL, y);
      doc.text('TripSync AI', pageW - marginR, y, { align: 'right' });
      y += 3;

      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, pageW - marginR, y);
      y += 8;
    }
  };

  // ── 1. Branded Header Banner (Page 1) ──────────────────────
  const destination = trip.destination || 'Trip Itinerary';
  const currency = trip.currency || 'INR';

  // Measure title lines with splitTextToSize to prevent clipping
  let titleFontSize = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFontSize);
  let titleLines = doc.splitTextToSize(destination, contentW);
  if (titleLines.length > 2) {
    titleFontSize = 18;
    doc.setFontSize(titleFontSize);
    titleLines = doc.splitTextToSize(destination, contentW);
  }

  const titleBlockHeight = Math.max(48, 28 + titleLines.length * 8 + 14);

  // Background banner
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, titleBlockHeight, 'F');

  // Small brand label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(210, 215, 255);
  doc.text('TRIPSYNC AI   •   TRAVEL ITINERARY', marginL, 14);

  // Destination title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFontSize);
  doc.setTextColor(...white);
  let titleY = 24;
  for (const line of titleLines) {
    doc.text(line, marginL, titleY);
    titleY += (titleFontSize * 0.42);
  }

  // Travel dates & duration subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 225, 255);
  const dateSub = `${formatDate(trip.startDate)}  –  ${formatDate(trip.endDate)}   |   ${trip.duration || 1} Days`;
  doc.text(dateSub, marginL, titleY + 4);

  y = titleBlockHeight + 8;

  // ── 2. Trip Overview Card ──────────────────────────────────
  ensureSpace(38);

  const cardStartY = y;
  const col1X = marginL + 5;
  const col2X = marginL + (contentW / 2) + 5;
  const colW  = (contentW / 2) - 10;

  // Calculate interests text wrapping to avoid cut-off
  const interestsList = (Array.isArray(trip.interests) && trip.interests.length > 0)
    ? trip.interests.map(i => String(i).trim()).filter(Boolean).join(', ')
    : 'None specified';
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const wrappedInterests = doc.splitTextToSize(interestsList, colW);
  const overviewCardH = Math.max(34, 22 + wrappedInterests.length * 4.5);

  // Draw card container
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, cardStartY, contentW, overviewCardH, 2, 2, 'FD');

  let curY = cardStartY + 6;

  // Column 1: Dates & Duration & Interests
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text('TRAVEL DATES', col1X, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text(`${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} (${trip.duration || 1} Days)`, col1X, curY + 4.5);

  curY += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text('INTERESTS', col1X, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  let intY = curY + 4;
  for (const line of wrappedInterests) {
    doc.text(line, col1X, intY);
    intY += 4;
  }

  // Column 2: Budget & Total Cost & Currency
  let col2Y = cardStartY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text('TOTAL BUDGET', col2X, col2Y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...textDark);
  doc.text(formatCurrency(trip.budget, currency), col2X, col2Y + 4.5);

  col2Y += 11;

  // Total Estimated Cost
  let totalCost = trip.itinerary.totalEstimatedCost;
  if (typeof totalCost !== 'number') {
    totalCost = days.reduce((sum, d) => {
      const daySum = (d.activities || []).reduce((aSum, a) => aSum + (Number(a.estimatedCost) || 0), 0);
      return sum + daySum;
    }, 0);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text('ESTIMATED ITINERARY COST', col2X, col2Y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primary);
  doc.text(formatCurrency(totalCost, currency), col2X, col2Y + 4.5);

  col2Y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Base Currency: ${currency}`, col2X, col2Y);

  y = cardStartY + overviewCardH + 10;

  // Section Header: Detailed Itinerary
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...textDark);
  doc.text('Day-by-Day Schedule', marginL, y);
  y += 6;

  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  // ── 3. Day-by-Day Itinerary ────────────────────────────────
  for (const day of days) {
    // Prevent orphan day headers: ensure space for day header PLUS at least one activity (~38mm)
    ensureSpace(36);

    // Day badge pill
    doc.setFillColor(...primary);
    doc.roundedRect(marginL, y - 4, 20, 7.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.text(`Day ${day.day}`, marginL + 3.5, y + 1.2);

    // Day date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...textDark);
    doc.text(formatDate(day.date), marginL + 25, y + 1.2);

    y += 8;

    const activities = Array.isArray(day.activities) ? day.activities : [];

    if (activities.length === 0) {
      ensureSpace(10);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text('No activities scheduled for this day.', marginL + 4, y);
      y += 8;
      continue;
    }

    for (const act of activities) {
      // ── Measure activity block to prevent splitting / clipping
      const category = act.category || '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const catTextW = category ? doc.getTextWidth(category) + 6 : 0;
      const maxTitleW = contentW - 10 - catTextW;

      // Wrapped title lines
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(act.name || 'Activity', maxTitleW);

      // Wrapped description lines
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      const descLines = act.description ? doc.splitTextToSize(act.description, contentW - 12) : [];

      // Wrapped location / info lines
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const timeStr = (act.startTime && act.endTime) ? `${act.startTime} – ${act.endTime}` : (act.startTime || '');
      const costStr = formatShortCurrency(act.estimatedCost, currency);
      const locStr = act.location || '';

      // Compute total activity height
      const titleH = titleLines.length * 4.5;
      const descH = descLines.length > 0 ? (descLines.length * 3.8 + 2) : 0;
      const metaH = 8; // time, loc, cost
      const actTotalH = titleH + descH + metaH + 6;

      // Ensure activity fits on current page cleanly
      ensureSpace(actTotalH);

      const actStartY = y;

      // Draw subtle background card with left accent line
      doc.setFillColor(252, 253, 255);
      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginL, actStartY, contentW, actTotalH, 1.5, 1.5, 'FD');

      // Left accent color indicator
      doc.setFillColor(...primary);
      doc.roundedRect(marginL, actStartY, 2, actTotalH, 1, 1, 'F');

      let actInnerY = actStartY + 4.5;

      // Draw Activity Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      for (const line of titleLines) {
        doc.text(line, marginL + 6, actInnerY);
        actInnerY += 4.5;
      }

      // Draw Category Badge on right
      if (category) {
        const catBadgeW = catTextW;
        const catX = pageW - marginR - catBadgeW - 3;
        doc.setFillColor(...primaryLight);
        doc.roundedRect(catX, actStartY + 2.5, catBadgeW, 5.5, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...primary);
        doc.text(category, catX + 3, actStartY + 6.2);
      }

      // Draw Description (italic)
      if (descLines.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...textMuted);
        for (const line of descLines) {
          doc.text(line, marginL + 6, actInnerY);
          actInnerY += 3.8;
        }
        actInnerY += 1;
      }

      // Draw Meta Row: Time, Location, Cost
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);

      const parts = [];
      if (timeStr) parts.push(`Time: ${timeStr}`);
      if (locStr) parts.push(`Location: ${locStr}`);
      if (costStr) parts.push(`Est. Cost: ${costStr}`);

      // Split meta text if it exceeds width to prevent cutoff
      const metaText = parts.join('   |   ');
      const metaLines = doc.splitTextToSize(metaText, contentW - 12);
      for (const line of metaLines) {
        doc.text(line, marginL + 6, actInnerY);
        actInnerY += 3.5;
      }

      y = actStartY + actTotalH + 3.5;
    }

    y += 3;
  }

  // ── 4. Total Cost & Grand Summary Box ──────────────────────
  ensureSpace(28);

  doc.setFillColor(...primaryLight);
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text(`Total Estimated Itinerary Cost: ${formatCurrency(totalCost, currency)}`, marginL + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  const budgetNum = Number(trip.budget || 0);
  const costNum = Number(totalCost || 0);
  let statusNote = '';
  if (budgetNum > 0) {
    const diff = budgetNum - costNum;
    if (diff >= 0) {
      statusNote = `Within budget by ${formatCurrency(diff, currency)}`;
    } else {
      statusNote = `Exceeds budget by ${formatCurrency(Math.abs(diff), currency)}`;
    }
  }
  doc.text(`Trip Budget: ${formatCurrency(trip.budget, currency)}${statusNote ? `   •   ${statusNote}` : ''}`, marginL + 6, y + 14);

  y += 26;

  // ── 5. Running Footer & Page Numbering across all pages ────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.2);
    doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('TripSync AI — Smart AI-Powered Travel Planner', marginL, pageH - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageW - marginR, pageH - 8, { align: 'right' });
  }

  // ── 6. Trigger Download ────────────────────────────────────
  const safeName = (trip.destination || 'Trip')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 35);
  doc.save(`TripSync_${safeName}_Itinerary.pdf`);
};
