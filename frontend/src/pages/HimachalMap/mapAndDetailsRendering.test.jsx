import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PriorityList } from './PriorityList.jsx';
import { HotspotDetailPanel } from './HotspotDetailPanel.jsx';
import { AlertCenter } from '../AlertCenter/AlertCenter.jsx';
import { AlertBanner, Toast, ErrorState, EmptyState } from '../../components/ui/index.js';
import { getFreshHpSampleHotspots } from '../../data/hpSampleData.js';

describe('Demo sample hotspot data', () => {
  it('seeds eight distinct requested districts with recent timestamps', () => {
    const expectedDistricts = [
      'Kangra',
      'Shimla',
      'Kullu',
      'Mandi',
      'Chamba',
      'Solan',
      'Una',
      'Sirmaur',
    ];
    const now = Date.now();
    const hotspots = getFreshHpSampleHotspots(now);
    const actualDistricts = hotspots.map((hotspot) => hotspot.district);

    expect(actualDistricts).toEqual(expectedDistricts);
    expect(new Set(actualDistricts).size).toBe(8);
    expect(hotspots.every((hotspot) => {
      const age = now - Date.parse(hotspot.lastUpdated);
      return age >= 0 && age < 20 * 60 * 1000 && hotspot._isSample;
    })).toBe(true);
  });
});

describe('Error and Empty State Components', () => {
  it('renders ErrorState with friendly error message and calls onRetry on button click', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Could not load hazard hotspots"
        message="Network request timed out. Check your connection."
        onRetry={handleRetry}
        retryLabel="Try again"
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load hazard hotspots')).toBeInTheDocument();
    expect(screen.getByText('Network request timed out. Check your connection.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState with a clear verb CTA button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No active hazard hotspots"
        description="There are currently no active flood or landslide alerts recorded in Himachal Pradesh."
        actionLabel="Report a hazard"
        onAction={handleAction}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('No active hazard hotspots')).toBeInTheDocument();
    expect(screen.getByText(/There are currently no active flood/i)).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /report a hazard/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('PriorityList Rendering', () => {
  it('renders accessible loading skeleton cards when loading and list is empty', () => {
    render(
      <MemoryRouter>
        <PriorityList hotspots={[]} loading={true} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/loading priority zones/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading ranked hotspot data/i)).toBeInTheDocument();
  });

  it('renders empty state with verb CTAs when no hotspots exist', () => {
    const handleRefresh = vi.fn();
    render(
      <MemoryRouter>
        <PriorityList hotspots={[]} loading={false} onRefresh={handleRefresh} />
      </MemoryRouter>
    );

    expect(screen.getByText('No critical hotspots reported')).toBeInTheDocument();
    const reportBtn = screen.getByRole('button', { name: /report a hazard/i });
    expect(reportBtn).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /refresh list/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('safely renders partial data with dashes (never null or NaN)', () => {
    const partialHotspots = [
      {
        hotspotId: 'hs_partial_1',
        wardName: null,
        wardNo: null,
        district: null,
        riskScore: null,
        riskBand: 'LOW',
        reportCount: null,
        activeReports: null,
        lastUpdated: null,
      },
    ];

    render(
      <MemoryRouter>
        <PriorityList hotspots={partialHotspots} loading={false} />
      </MemoryRouter>
    );

    // Missing fields should show dashes
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    // Report count missing should show dash
    expect(screen.getByText(/— report/i)).toBeInTheDocument();
    // Must never contain string "null" or "NaN"
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
  });
});

describe('HotspotDetailPanel Rendering', () => {
  it('renders fallback dash when risk score and factors are missing or null', () => {
    const partialHotspot = {
      hotspotId: 'hs_test',
      wardName: 'Test Area',
      district: 'Kangra',
      riskScore: null,
      riskBand: 'UNKNOWN',
      activeReports: null,
      reportCount: null,
      lastUpdated: null,
      riskFactors: null,
    };

    render(
      <MemoryRouter>
        <HotspotDetailPanel hotspot={partialHotspot} matchingReports={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Area')).toBeInTheDocument();
    expect(screen.getByText(/Kangra/i)).toBeInTheDocument();
    // Missing stats should show dashes
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);

    // Empty factors notice
    expect(
      screen.getByText('Risk factors appear when the risk model is connected')
    ).toBeInTheDocument();

    // Empty reports notice with verb CTA
    expect(
      screen.getByText('No recent citizen reports linked directly to this hotspot yet.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /report a hazard here/i })
    ).toBeInTheDocument();

    // Must never display raw "null" or "NaN"
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^null$/i)).not.toBeInTheDocument();
  });

  it('renders report cards with plain-language assessment, hazard-photo fallback, and a separate compact gauge', () => {
    const reports = [
      {
        reportId: 'report-knee',
        hazardType: 'flood',
        createdAt: '2026-10-10T12:00:00.000Z',
        assessment: {
          depthClass: 'knee',
          passable: 'no',
          confidence: 0.83,
        },
      },
      {
        reportId: 'report-caution',
        hazardType: 'landslide',
        createdAt: '2026-10-10T12:05:00.000Z',
        photoPreview: 'https://example.invalid/hazard.jpg',
        assessment: {
          depthClass: 'ankle',
          passable: 'caution',
          confidence: 0.72,
        },
      },
    ];

    render(
      <MemoryRouter>
        <HotspotDetailPanel
          hotspot={{ hotspotId: 'hs_reports', riskBand: 'HIGH' }}
          matchingReports={reports}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Knee-deep, about 60 cm')).toBeInTheDocument();
    expect(screen.getByText('83% sure')).toBeInTheDocument();
    expect(screen.getByText('Not passable')).toBeInTheDocument();
    expect(screen.getByText('Ankle-deep, about 30 cm')).toBeInTheDocument();
    expect(screen.getByText('72% sure')).toBeInTheDocument();
    expect(screen.getByText('Use caution')).toBeInTheDocument();

    const photoFallback = screen.getByRole('img', { name: /no photo available\. flood hazard report/i });
    expect(photoFallback.querySelector('svg')).toBeInTheDocument();
    expect(photoFallback).not.toHaveTextContent(/assessed/i);

    const brokenImage = screen.getByRole('img', { name: /citizen submitted landslide photo/i });
    fireEvent.error(brokenImage);
    expect(screen.getByRole('img', { name: /no photo available\. landslide report/i })).toBeInTheDocument();

    const depthGauges = screen.getAllByRole('img', { name: /estimated water depth/i });
    expect(depthGauges).toHaveLength(2);
    expect(depthGauges[0].parentElement.className).toContain('gaugeContainer');
    expect(depthGauges[0].querySelector('svg').parentElement).toHaveStyle({ height: '40px' });
    expect(screen.getAllByLabelText(/Reported .*Exact time:/i)).toHaveLength(2);
  });

  it('renders error state and NEVER "no hotspots" empty state when request failed', () => {
    const handleRetry = vi.fn();
    render(
      <MemoryRouter>
        <PriorityList
          hotspots={[]}
          loading={false}
          error={new Error('Unable to connect to the hazard monitoring service.')}
          onRefresh={handleRetry}
        />
      </MemoryRouter>
    );

    // Shows error state
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/could not load priority hotspots/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to connect to the hazard monitoring service/i)).toBeInTheDocument();

    // NEVER shows "no hotspots" empty state
    expect(screen.queryByText(/no critical hotspots reported/i)).not.toBeInTheDocument();

    // Clicking retry invokes onRefresh
    const retryBtn = screen.getByRole('button', { name: /retry loading list/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders "Where to send help first" hero card, district breakdown, and status stepper', () => {
    const handleSelect = vi.fn();
    const handleUpdateStatus = vi.fn();
    const sampleHotspots = [
      {
        hotspotId: 'hs_urgent_1',
        wardName: 'Dharamshala Riverfront',
        district: 'Kangra',
        riskScore: 92,
        riskBand: 'SEVERE',
        reportCount: 14,
        activeReports: 9,
        lastUpdated: new Date().toISOString(),
        opsStatus: 'open',
      },
      {
        hotspotId: 'hs_urgent_2',
        wardName: 'Mall Road Lower',
        district: 'Shimla',
        riskScore: 68,
        riskBand: 'HIGH',
        reportCount: 6,
        activeReports: 2,
        lastUpdated: new Date(Date.now() - 120000).toISOString(),
        opsStatus: 'dispatched',
      },
    ];

    render(
      <MemoryRouter>
        <PriorityList
          hotspots={sampleHotspots}
          onSelectHotspot={handleSelect}
          onUpdateStatus={handleUpdateStatus}
        />
      </MemoryRouter>
    );

    // Answers "where do we send help first?" at a glance
    expect(screen.getByText(/Where to send help first • Rank #1/i)).toBeInTheDocument();
    expect(screen.getAllByText('Dharamshala Riverfront').length).toBeGreaterThanOrEqual(1);

    // Suggested action line labeled as suggestion
    expect(screen.getByText('Suggested action')).toBeInTheDocument();
    expect(
      screen.getByText(/Dispatch emergency response crews, deploy high-capacity dewatering pumps/i)
    ).toBeInTheDocument();

    // District breakdown cards
    expect(screen.getByText('All districts')).toBeInTheDocument();
    expect(screen.getAllByText('Kangra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Shimla').length).toBeGreaterThanOrEqual(1);

    // Status stepper buttons
    const dispatchBtns = screen.getAllByRole('button', { name: /dispatched/i });
    expect(dispatchBtns.length).toBeGreaterThan(0);
    fireEvent.click(dispatchBtns[0]);
    expect(handleUpdateStatus).toHaveBeenCalledWith('hs_urgent_1', 'dispatched');

    // Click focus on map
    const focusBtn = screen.getByRole('button', { name: /focus #1 priority zone/i });
    fireEvent.click(focusBtn);
    expect(handleSelect).toHaveBeenCalledWith(sampleHotspots[0]);
  });
});

describe('Alerts Redesign and Advisory Requirements', () => {
  const mockHotspots = [
    {
      hotspotId: 'hs_alert_1',
      wardName: 'Dharamshala Riverfront',
      district: 'Kangra',
      riskScore: 88,
      riskBand: 'SEVERE',
      activeReports: 4,
      lastUpdated: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      lat: 32.22,
      lng: 76.32,
    },
    {
      hotspotId: 'hs_alert_2',
      wardName: 'Mall Road Lower',
      district: 'Shimla',
      riskScore: 65,
      riskBand: 'HIGH',
      activeReports: 2,
      lastUpdated: new Date(Date.now() - 720000).toISOString(), // 12 min ago
      lat: 31.10,
      lng: 77.17,
    },
  ];

  it('renders AlertCenter with severity, affected area, message, time, and mandatory advisory disclaimer', () => {
    const handleFocus = vi.fn();
    render(
      <MemoryRouter>
        <AlertCenter
          hotspots={mockHotspots}
          onFocusHotspot={handleFocus}
          supportsSubscriptions={false}
        />
      </MemoryRouter>
    );

    // Mandatory advisory line
    expect(
      screen.getByText(/Community-submitted and AI-assessed\. Advisory only\. In an emergency call 112\./i)
    ).toBeInTheDocument();

    // Severity badges
    expect(screen.getByText('Severe risk')).toBeInTheDocument();
    expect(screen.getByText('High risk')).toBeInTheDocument();

    // Affected areas
    expect(screen.getByText(/Dharamshala Riverfront/i)).toBeInTheDocument();
    expect(screen.getByText(/Mall Road Lower/i)).toBeInTheDocument();

    // Advisory messages
    expect(screen.getByText(/Critical flood risk/i)).toBeInTheDocument();
    expect(screen.getByText(/High flood warning/i)).toBeInTheDocument();

    // Timestamps
    expect(screen.getByText(/5 min ago/i)).toBeInTheDocument();
    expect(screen.getByText(/12 min ago/i)).toBeInTheDocument();

    // Hides subscription opt-in when supportsSubscriptions={false}
    expect(screen.queryByText(/Get nearby hazard alerts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Proactive Early Warning Alerts/i)).not.toBeInTheDocument();

    // Focus on map action
    const focusBtns = screen.getAllByRole('button', { name: /focus on map/i });
    expect(focusBtns.length).toBeGreaterThan(0);
    fireEvent.click(focusBtns[0]);
    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('renders dismissible in-app AlertBanner with advisory notice and triggers dismiss', () => {
    const handleFocus = vi.fn();
    const handleDismiss = vi.fn();
    const mockAlert = {
      id: 'alert_hs_alert_1',
      severity: 'SEVERE',
      areaName: 'Dharamshala Riverfront',
      message: 'Critical flood hazard: deep water accumulation exceeding waist depth.',
      distanceKm: 1.4,
    };

    render(
      <AlertBanner
        alert={mockAlert}
        onFocus={handleFocus}
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Dharamshala Riverfront')).toBeInTheDocument();
    expect(screen.getByText(/Critical flood hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.4 km away/i)).toBeInTheDocument();

    // Mandatory advisory line
    expect(
      screen.getByText(/Community-submitted and AI-assessed\. Advisory only\. In an emergency call 112\./i)
    ).toBeInTheDocument();

    // View on map
    const viewBtn = screen.getByRole('button', { name: /view dharamshala riverfront on map/i });
    fireEvent.click(viewBtn);
    expect(handleFocus).toHaveBeenCalledWith(mockAlert);

    // Dismiss
    const dismissBtn = screen.getByRole('button', { name: /dismiss this warning/i });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledWith('alert_hs_alert_1');
  });

  it('renders notification-style Toast with emergency details and disclaimer', () => {
    const handleAction = vi.fn();
    const handleDismiss = vi.fn();

    const notifPayload = {
      title: 'Emergency flood warning',
      areaName: 'Kangra Sector 4',
      message: 'Water levels rising rapidly across low-lying culverts.',
      time: 'Just now',
      onAction: handleAction,
      actionLabel: 'Focus on map',
    };

    render(
      <Toast
        id="toast_test_1"
        type="error"
        message={notifPayload}
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Emergency hazard alert')).toBeInTheDocument();
    expect(screen.getByText(/Emergency flood warning • Kangra Sector 4/i)).toBeInTheDocument();
    expect(screen.getByText('Water levels rising rapidly across low-lying culverts.')).toBeInTheDocument();
    expect(
      screen.getByText(/Community-submitted and AI-assessed\. Advisory only\. In an emergency call 112\./i)
    ).toBeInTheDocument();

    // Action button
    const actionBtn = screen.getByRole('button', { name: 'Focus on map' });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);

    // Dismiss button
    const dismissBtn = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledWith('toast_test_1');
  });
});
