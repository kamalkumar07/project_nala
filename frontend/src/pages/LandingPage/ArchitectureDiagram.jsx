import React from 'react';
import {
  Camera,
  BrainCircuit,
  Mountain,
  MapPinned,
} from 'lucide-react';
import styles from './LandingPage.module.css';

const WORKFLOW_STAGES = [
  {
    id: 'reports',
    number: '01',
    title: 'Community Reports',
    description:
      'Citizens share photographs and observations of potentially hazardous conditions.',
    Icon: Camera,
  },
  {
    id: 'analysis',
    number: '02',
    title: 'Intelligent Analysis',
    description:
      'Available visual and environmental information helps assess potential risks.',
    Icon: BrainCircuit,
  },
  {
    id: 'intelligence',
    number: '03',
    title: 'Risk Intelligence',
    description:
      'Terrain, rainfall, and available reports help identify areas that may need attention.',
    Icon: Mountain,
  },
  {
    id: 'action',
    number: '04',
    title: 'Informed Action',
    description:
      'Risk information helps citizens stay aware and supports local response planning.',
    Icon: MapPinned,
  },
];

export function ArchitectureDiagram() {
  return (
    <div
      className={styles.workflowGrid}
      role="group"
      aria-label="PARVAT risk intelligence workflow"
    >
      {WORKFLOW_STAGES.map(({ id, number, title, description, Icon }) => (
        <article key={id} className={styles.workflowCard}>
          <div className={styles.workflowCardTop}>
            <span className={styles.workflowNumber}>{number}</span>

            <div className={styles.workflowIcon} aria-hidden="true">
              <Icon size={25} strokeWidth={1.8} />
            </div>
          </div>

          <h3 className={styles.workflowTitle}>{title}</h3>

          <p className={styles.workflowDescription}>{description}</p>
        </article>
      ))}
    </div>
  );
}