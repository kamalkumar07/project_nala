import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage.jsx';
import { ArchitectureDiagram } from './ArchitectureDiagram.jsx';
import { HeroPhoneMap } from './HeroPhoneMap.jsx';

describe('LandingPage — Product-First Rebuild', () => {
  it('renders hero with correct headline, subhead, and CTAs', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Headline
    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline).toHaveTextContent('Know where hazards are building across Himachal Pradesh.');

    // CTAs
    expect(screen.getByRole('button', { name: /open live map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /watch it work/i })).toBeInTheDocument();
    expect(screen.getAllByText('PARVAT').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Predictive Analytics for Risk, Vulnerability and Terrain/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'For ward teams' }).length).toBeGreaterThan(0);

    // Phone preview in hero
    expect(screen.getByLabelText(/live mobile preview of himachal pradesh hazard map/i)).toBeInTheDocument();
  });

  it('renders the 3-step story section with photo, AI depth assessment, and map pin steps', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // 3-step story section heading
    expect(screen.getByText(/the 3-step story/i)).toBeInTheDocument();
    expect(screen.getByText(/from a citizen photo to an early warning/i)).toBeInTheDocument();

    // Step 1 framing guide
    expect(screen.getByText(/include a tyre, kerb, road edge or a person for scale/i)).toBeInTheDocument();
    expect(screen.getByTestId('street-scene')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Dharamshala Road, Kangra')
    );

    fireEvent.click(screen.getByRole('button', { name: 'Akhara Bazar' }));
    expect(screen.getByTestId('street-scene')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Akhara Bazar, Kullu')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cart Road Crossing' }));
    expect(screen.getByTestId('street-scene')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Cart Road Crossing, Shimla')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dharamshala Road' }));

    // Switch to step 2 (AI assessment)
    const step2Tab = screen.getByRole('tab', { name: /ai reads hazard/i });
    expect(screen.queryByText('Analysis trigger:')).not.toBeInTheDocument();
    expect(screen.queryByText('Automatic direct S3 presigned upload')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see what the ai reads/i })).toBeInTheDocument();
    fireEvent.click(step2Tab);
    expect(screen.getByText('AI water-depth reading')).toBeInTheDocument();
    expect(screen.getByText('Road access')).toBeInTheDocument();
    expect(screen.getByTestId('rising-water')).toBeInTheDocument();
    expect(screen.getByTestId('depth-fill-animated')).toBeInTheDocument();

    // Switch to step 3 (Pin on map)
    const step3Tab = screen.getByRole('tab', { name: /pin on district map/i });
    fireEvent.click(step3Tab);
    expect(screen.getByText(/live regional hotspot plotted/i)).toBeInTheDocument();
    expect(screen.getByText(/proactive alert dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/municipal pump priority queue/i)).toBeInTheDocument();
  });

  it('renders the two persona cards for travellers & residents and district response teams', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /travellers and residents/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /district response teams/i })).toBeInTheDocument();
  });

  it('renders Under the Hood architecture diagram with all 7 required nodes and plain captions', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /under the hood/i })).toBeInTheDocument();

    // 7 architecture nodes: Phone, S3, Bedrock, DynamoDB, Risk engine, Cloud API, Map and alerts
    const requiredNodes = [
      'Phone',
      'S3',
      'Bedrock',
      'DynamoDB',
      'Cloud API',
      'Risk engine',
      'Map and alerts',
    ];

    requiredNodes.forEach((nodeName) => {
      const nodes = screen.getAllByText(nodeName);
      expect(nodes.length).toBeGreaterThan(0);
    });

    // Plain captions (rendered in desktop grid and mobile stacked list)
    expect(screen.getAllByText(/citizen photographs street with mandatory gps coordinates/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/direct presigned put upload bypasses server bottlenecks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/analyzes visual markers \(tyres, kerbs\) to estimate depth/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/millisecond-latency store indexing reports/i).length).toBeGreaterThan(0);
  });

  it('renders clean footer with strictly the 3 allowed links and the mandatory U5 advisory line', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();

    // Allowed links strictly within the clean footer
    const footerLiveMap = footer.querySelector('button:nth-of-type(1)');
    const footerReport = footer.querySelector('button:nth-of-type(2)');
    const footerWard = footer.querySelector('button:nth-of-type(3)');

    expect(footerLiveMap).toHaveTextContent('Live map');
    expect(footerReport).toHaveTextContent('Report a hazard');
    expect(footerWard).toHaveTextContent('For ward teams');

    const footerButtons = footer.querySelectorAll('nav button');
    expect(footerButtons.length).toBe(3);
    expect(footer).not.toHaveTextContent(/S3|Bedrock|DynamoDB|Amazon/i);
    expect(footer).not.toHaveTextContent(/\bAWS\b/i);

    // Removed items must NOT be in footer
    expect(footer).not.toHaveTextContent(/design system/i);
    expect(footer).not.toHaveTextContent(/port 8080/i);
    expect(footer).not.toHaveTextContent(/port 5173/i);
    expect(footer).not.toHaveTextContent(/track 02/i);
    expect(footer).not.toHaveTextContent(/wemakedevs/i);

    // Advisory line from U5
    expect(screen.getByText('Community-submitted and AI-assessed. Advisory only. In an emergency call 112.')).toBeInTheDocument();
  });
});
