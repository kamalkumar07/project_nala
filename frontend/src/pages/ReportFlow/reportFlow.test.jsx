import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportFlowPage } from './ReportFlowPage.jsx';
import { useReportStore } from './useReportStore.js';

vi.mock('maplibre-gl', () => {
  function MockMap() {
    return {
      on: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
      isStyleLoaded: vi.fn(() => false),
      easeTo: vi.fn(),
      getZoom: vi.fn(() => 8),
    };
  }
  function MockMarker() {
    return {
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      getLngLat: vi.fn(() => ({ lat: 31.1, lng: 77.1 })),
    };
  }
  function MockAttributionControl() {
    return {};
  }
  return {
    Map: MockMap,
    Marker: MockMarker,
    AttributionControl: MockAttributionControl,
    setWorkerUrl: vi.fn(),
  };
});

describe('ReportFlowPage 2-Step Flow', () => {
  beforeEach(() => {
    useReportStore.getState().reset();
  });

  it('renders Step 1 camera-first capture with framing guide and buttons', () => {
    render(
      <MemoryRouter>
        <ReportFlowPage />
      </MemoryRouter>
    );

    // Framing guide overlay text
    expect(
      screen.getByText(/include a tyre, kerb, road edge or a person for scale/i)
    ).toBeInTheDocument();

    // Take photo and Choose from gallery buttons
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose from gallery/i })).toBeInTheDocument();

    // Zero mention of vendor names
    expect(screen.queryByText(/bedrock/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/aws/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/s3/i)).not.toBeInTheDocument();
  });

  it('renders Step 2 with photo thumbnail, location, hazard segmented control, counter, and Send report button', () => {
    // Seed store with photo
    const mockFile = new File(['fake-bytes'], 'test.jpg', { type: 'image/jpeg' });
    useReportStore.getState().setPhoto(mockFile, mockFile, 'blob:http://localhost/test.jpg');
    useReportStore.getState().setLocation(31.1048, 77.1734, 'Shimla, Himachal Pradesh');

    render(
      <MemoryRouter>
        <ReportFlowPage />
      </MemoryRouter>
    );

    // Step 2 header
    expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/captured incident photo/i)).toBeInTheDocument();

    // Location details
    expect(screen.getByText(/shimla, himachal pradesh/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust location on map/i })).toBeInTheDocument();

    // Hazard categories segmented control
    expect(screen.getByRole('tab', { name: /flood/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /landslide/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /waterlogging/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /road damage/i })).toBeInTheDocument();

    // Character counter
    expect(screen.getByText(/0 \/ 500/i)).toBeInTheDocument();

    // Send report primary button
    expect(screen.getByRole('button', { name: /send report/i })).toBeInTheDocument();
  });

  it('shows friendly warning and offers sample Himachal locations (Kangra, Shimla, Kullu, Mandi) when coordinates are outside HP', () => {
    const mockFile = new File(['fake-bytes'], 'test.jpg', { type: 'image/jpeg' });
    useReportStore.getState().setPhoto(mockFile, mockFile, 'blob:http://localhost/test.jpg');
    // Delhi coordinates (outside HP)
    useReportStore.getState().setLocation(28.6139, 77.2090, 'New Delhi');

    render(
      <MemoryRouter>
        <ReportFlowPage />
      </MemoryRouter>
    );

    // Warning banner
    expect(screen.getAllByText(/outside himachal pradesh/i).length).toBeGreaterThan(0);

    // 4 Sample HP location chips
    const kangraChip = screen.getByRole('button', { name: /kangra/i });
    const shimlaChip = screen.getByRole('button', { name: /shimla/i });
    const kulluChip = screen.getByRole('button', { name: /kullu/i });
    const mandiChip = screen.getByRole('button', { name: /mandi/i });

    expect(kangraChip).toBeInTheDocument();
    expect(shimlaChip).toBeInTheDocument();
    expect(kulluChip).toBeInTheDocument();
    expect(mandiChip).toBeInTheDocument();

    // Clicking Kangra sample updates location
    fireEvent.click(kangraChip);
    expect(useReportStore.getState().lat).toBe(32.10);
    expect(useReportStore.getState().lng).toBe(76.27);
  });
});
