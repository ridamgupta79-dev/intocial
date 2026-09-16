# INTOCIAL

## Intelligence Operations & Social Intelligence Analysis

AI-powered social intelligence platform for detecting, correlating, and investigating emerging threats across fragmented social signals.

INTOCIAL is an end-to-end social intelligence platform that combines multi-source signal ingestion, AI-assisted risk analysis, incident management, cross-signal correlation, multimodal image analysis, analytics, and intelligence reporting into a unified operational dashboard.

## Overview

Modern social platforms generate large volumes of fragmented and rapidly changing information. INTOCIAL is designed to transform these signals into structured intelligence that can be reviewed, correlated, and investigated from a single workspace.

### Key Capabilities

- Multi-source social signal ingestion
- AI-assisted risk and threat analysis
- Entity and contextual analysis
- Explainable risk scoring
- Incident creation and management
- Cross-signal and cross-platform correlation
- Temporal and event-level correlation
- Risk alerts and acknowledgement workflows
- Image-based multimodal analysis
- Historical analytics and anomaly detection
- Intelligence report generation
- Authenticated API access
- Operational investigation dashboard

## Core Capabilities

### Social Signal Ingestion

INTOCIAL uses a common signal-processing architecture for multiple social platforms.

| Source | Current Status |
|---|---|
| YouTube | Real API ingestion |
| Reddit | Simulated / mock ingestion |
| X | Simulated / mock ingestion |
| Instagram | Simulated / mock ingestion |

YouTube is currently the primary real external-data ingestion source. The other connectors use simulated data for development and demonstration.

### AI-Powered Risk Analysis

Signals are processed through an analytical pipeline containing components for:

- NLP processing
- Entity extraction
- Contextual analysis
- Risk scoring
- Threat indicators
- Explainable risk components
- Anomaly detection
- Signal-level intelligence

The system is designed to expose analytical evidence behind risk assessments rather than relying only on an opaque prediction.

### Incident Intelligence

Related signals can be grouped into incidents based on similarity and contextual relationships.

The incident workflow supports:

- Incident creation
- Signal attachment
- Incident risk calculation
- Similarity-based grouping
- Signal aggregation
- Incident-level intelligence
- Incident management

### Correlation Engine

INTOCIAL correlates signals across multiple dimensions:

- Content similarity
- Entity overlap
- Cross-platform corroboration
- Temporal relationships
- Event-level relationships

This helps transform fragmented signals into connected investigative evidence.

### Risk & Alerts

The alerting layer provides:

- Risk-based alerts
- Alert severity
- Alert details
- Alert acknowledgement
- Connection between analytical risk and operational review

### Multimodal Analysis

INTOCIAL currently supports image-based multimodal analysis.

The system can analyze image inputs as part of the intelligence workflow.

Video analysis is not currently implemented.

### Analytics

The analytics workspace provides:

- Historical risk trends
- Platform distribution
- Risk distribution
- High-risk activity
- Anomaly detection
- Historical signal analysis

### Intelligence Reports

Investigations and incidents can be converted into structured intelligence reports containing analytical evidence and explanations for further review.

## Architecture

                    +---------------------+
                    |   Social Sources    |
                    | YouTube / Reddit /  |
                    | X / Instagram       |
                    +----------+----------+
                               |
                               v
                    +---------------------+
                    |   Signal Ingestion  |
                    |   & Normalization   |
                    +----------+----------+
                               |
                               v
                    +---------------------+
                    |     AI Analysis     |
                    | NLP / Entities /    |
                    | Context / Risk      |
                    +----------+----------+
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
       +------------+   +------------+   +------------+
       | Incidents  |   | Correlation|   |   Alerts   |
       +-----+------+   +------+-----+   +------+-----+
             |                 |                |
             +-----------------+----------------+
                               |
                               v
                    +---------------------+
                    | Intelligence Layer |
                    | Reports / Analytics |
                    +----------+----------+
                               |
                               v
                    +---------------------+
                    |  INTOCIAL Dashboard |
                    | Investigation UI    |
                    +---------------------+

## Technology Stack

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- psycopg2
- JWT authentication

### AI / Machine Learning

- PyTorch
- Hugging Face Transformers
- scikit-learn
- spaCy
- NumPy
- Pandas
- Pillow

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts
- Lucide React

### Development & Testing

- Pytest
- Jupyter
- Conda
- Git

## Project Structure

social-media-analytics/
|
+-- dashboard/
|   +-- public/
|   +-- src/
|       +-- components/
|       +-- pages/
|       +-- services/
|   +-- package.json
|   +-- vite.config.js
|
+-- data/
|   +-- raw/
|   +-- processed/
|   +-- live/
|
+-- models/
|   +-- distilbert-crisisbench/
|   +-- risk_config.json
|
+-- notebooks/
|
+-- src/
|   +-- api/
|   +-- data/
|   +-- database/
|   +-- models/
|   +-- services/
|
+-- tests/
|
+-- migrate_signals.py
+-- simulate_stream.py
+-- requirements.txt
+-- .env.example
+-- .gitignore
+-- README.md

## Prerequisites

Before running INTOCIAL locally, install:

- Python 3.x
- Node.js
- PostgreSQL
- Git
- Conda or another Python environment manager

## Installation

### 1. Clone the Repository

git clone https://github.com/ridamgupta79-dev/social-media-analytics.git
cd social-media-analytics

### 2. Create the Python Environment

conda create -n social-media-analytics python=3.12
conda activate social-media-analytics

### 3. Install Python Dependencies

pip install -r requirements.txt

### 4. Install the spaCy Language Model

python -m spacy download en_core_web_sm

## Environment Configuration

Create a local .env file from the provided template.

On Windows PowerShell:

Copy-Item .env.example .env

Configure the required credentials and database connection inside .env.

The project uses the following environment variables:

X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=

YOUTUBE_API_KEY=

INSTAGRAM_ACCESS_TOKEN=

DATABASE_URL=

SECRET_KEY=

Never commit .env or real API credentials to GitHub.

## Database

INTOCIAL uses PostgreSQL for persistent application data.

Configure the PostgreSQL connection through:

DATABASE_URL=

The project includes database initialization and migration-related functionality.

## Running the Backend

From the project root:

uvicorn src.api.main:app --reload

Backend:

http://localhost:8000

FastAPI documentation:

http://localhost:8000/docs

## Running the Frontend

Open a second terminal:

cd dashboard
npm install
npm run dev

Frontend:

http://localhost:5173

## API Areas

The backend provides functionality across areas including:

/auth
/predict
/analyze
/analyze-multimodal
/ingest
/ingest/youtube
/ingest/reddit
/ingest/x
/ingest/instagram
/incidents
/alerts
/correlation
/reports
/analytics
/health

Interactive API documentation is available through FastAPI Swagger UI at:

http://localhost:8000/docs

## Security

The application includes security measures such as:

- JWT-based authentication
- Protected intelligence endpoints
- Authenticated frontend API requests
- Restricted development CORS configuration
- Environment-based secret management
- Image upload validation
- File-size restrictions for image uploads
- Sensitive configuration excluded through .gitignore

## Dataset

Parts of the machine-learning workflow use the CrisisMMD / CrisisBench dataset for model development and experimentation.

The dataset is not included in this repository.

Large raw datasets, processed datasets, and generated data are excluded from GitHub.

To reproduce the relevant ML experiments, obtain the required dataset separately and place it in the expected local data directories.

## Model Artifacts

Large trained model weights and training checkpoints are intentionally excluded from GitHub.

The repository keeps lightweight configuration and tokenizer files where useful, while large model artifacts such as:

*.safetensors
*.pt
*.pth
*.pkl

are excluded.

This keeps the repository manageable while preserving the source code and model configuration.

## Testing

Run the test suite with:

pytest

The project contains tests covering major application workflows including:

- Authentication
- Risk analysis
- Incidents
- Alerts
- Correlation
- Intelligence workflows
- API functionality

## Current Implementation Status

INTOCIAL is currently a local research and prototype platform.

The implemented system has been tested across:

- Frontend workflows
- Backend API workflows
- Authentication and session handling
- Signal ingestion
- Risk analysis
- Incident workflows
- Correlation workflows
- Alert workflows
- Multimodal image analysis
- Analytics
- Intelligence reporting

The YouTube connector is currently the primary real external-data ingestion path.

Reddit, X, and Instagram connectors currently use simulated data for development and demonstration.

## Limitations

Current limitations include:

- Reddit ingestion is simulated.
- X ingestion is simulated.
- Instagram ingestion is simulated.
- Multimodal analysis currently focuses on images.
- External API availability depends on provider credentials and quotas.
- Large ML model weights are not distributed with the repository.
- The current system is intended for local development and demonstration rather than production deployment.

## Roadmap

Potential future development includes:

- Production-grade social platform integrations
- Distributed ingestion workers
- Real-time streaming infrastructure
- Scalable intelligence processing
- Advanced multimodal models
- Entity knowledge graphs
- Analyst collaboration workflows
- Production deployment
- Expanded automated evaluation and monitoring

## Responsible Use

INTOCIAL is designed as an intelligence analysis and decision-support platform.

Risk scores, correlations, alerts, and analytical outputs should be treated as investigative signals requiring appropriate human review and contextual verification rather than as automatically established facts.

## Author

Ridam Gupta

AI / Machine Learning · Software Development · Data & Intelligence Systems

## Project

INTOCIAL — Intelligence Operations & Social Intelligence Analysis

An AI/ML engineering project combining machine learning, data processing, backend systems, correlation intelligence, and an operational investigation interface.
