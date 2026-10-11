# PARVAT — Predictive Analytics for Risk, Vulnerability and Terrain
# PARVAT — Intelligent Flood Monitoring & Risk Assessment

### Turning Community Reports into Actionable Flood Intelligence

PARVAT is an intelligent flood-monitoring platform designed to help
citizens identify waterlogged streets, understand flood risks, and make
safer travel decisions during heavy rainfall.

By combining citizen-submitted photographs, geographical information,
rainfall indicators, and risk-assessment models, PARVAT aims to provide
a clearer picture of developing flood conditions.

The platform also aims to help local authorities identify vulnerable
areas and prioritize flood-response efforts.

> **Our vision:** Make flood information more accessible, actionable,
> and community-driven.

---

## 📌 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [AWS Integration](#-aws-integration)
- [How the Platform Works](#-how-the-platform-works)
- [AI and Flood-Risk Assessment](#-ai-and-flood-risk-assessment)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Current Implementation Status](#-current-implementation-status)
- [Team Contributions](#-team-contributions)
- [Future Roadmap](#-future-roadmap)
- [Security Considerations](#-security-considerations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚨 The Problem

During monsoon seasons and periods of intense rainfall, roads can
become flooded with little warning.

Citizens may not know:

- Which streets are currently waterlogged.
- Whether a road is safe or passable.
- Which nearby areas are experiencing severe flooding.
- Where flood conditions may deteriorate next.
- Which locations authorities should prioritize for intervention.

Traditional flood information can be fragmented, delayed, or difficult
to access at street level.

PARVAT aims to bridge this information gap by combining community
reporting, geographical context, and computational risk assessment
in a single platform.

## 💡 Our Solution

PARVAT connects citizen observations with cloud infrastructure and
flood-risk assessment.

The platform is designed around four capabilities:

1. **Community Reporting:** Citizens submit photographs and location
   information about waterlogged streets.

2. **Flood-Risk Assessment:** Environmental indicators and available
   geographical information are used to estimate risk.

3. **Map-Based Visualization:** Flood hotspots and their risk levels
   can be presented through a centralized dashboard.

4. **Decision Support:** Risk information can help citizens make
   informed travel decisions and help authorities prioritize
   flood-response resources.

Our long-term goal is to move from reactive flood reporting toward
more proactive, data-informed flood awareness.

---

## ✨ Key Features

### 📸 1. Citizen Flood Reporting

The reporting workflow is designed to collect:

- Photographs of waterlogged streets.
- Geographic coordinates.
- Optional descriptions.
- Report submission timestamps.

Photographs are uploaded through a cloud-backed workflow using
presigned S3 URLs.

### 🗺️ 2. Flood Hotspot Visualization

The dashboard presents flood hotspots with information such as:

- Location and geographical coordinates.
- Risk score and risk category.
- Report counts.
- Recent update timestamps.
- Available environmental risk indicators.

**Implementation note:** The current hotspot endpoint includes
seeded demonstration data. Live hotspot aggregation is still a
development goal.

### 🌦️ 3. Flood-Risk Assessment

PARVAT includes a risk-assessment API that accepts geographic
coordinates and optional environmental indicators.

Depending on the available inputs, the assessment can return a
provisional risk result or indicate that there is insufficient data.

The assessment is intended to support future integration of
rainfall, terrain, and water-accumulation information.

### ☁️ 4. Cloud-Based Architecture

AWS provides the infrastructure for:

- Backend API hosting.
- Serverless API operations.
- Image storage.
- Container image management.
- Frontend hosting.
- Access control and networking.

### 📊 5. Decision-Support Potential

The platform is designed to evolve toward:

- Earlier identification of flood-prone streets.
- Better visibility into reported incidents.
- Prioritization of high-risk locations.
- Improved coordination between citizens and authorities.

These capabilities depend on reliable data collection, validated
risk models, and successful integration of the relevant services.

---

## 🏗️ System Architecture

PARVAT uses a combination of containerized application services
and serverless AWS components.

### High-Level Architecture

```text
                    ┌────────────────────────┐
                    │       CITIZENS         │
                    │  Submit Flood Reports  │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   PARVAT FRONTEND       │
                    │      React + Vite      │
                    │     AWS Amplify        │
                    └────────────┬───────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌──────────────────────┐        ┌────────────────────────┐
    │ Containerized API    │        │ AWS API Gateway        │
    │ AWS App Runner       │        │          │             │
    │ Node.js / Express    │        │          ▼             │
    └──────────────────────┘        │     AWS Lambda         │
                                    │          │             │
                                    │          ▼             │
                                    │       Amazon S3         │
                                    │   Flood Report Images  │
                                    └────────────────────────┘

                ┌────────────────────────────────┐
                │       Risk Assessment          │
                │ Coordinates + Available Data  │
                │       Risk API                 │
                └────────────────────────────────┘
