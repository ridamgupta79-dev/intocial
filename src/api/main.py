from datetime import date
from typing import Any

import requests
import torch
from fastapi import (
    Depends,
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func

from src.api.auth import (
    router as auth_router,
    get_current_user,
)
from src.data.adapters import adapt_post
from src.data.dashboard_data import load_dashboard_signals
from src.data.ingestion import normalize_post
from src.data.live_storage import (
    save_live_signal,
    load_live_signals,
    count_live_signals,
    get_live_signal_counts,
)
from src.data.reddit_adapter import ingest_reddit_mock
from src.data.x_adapter import ingest_x_mock
from src.data.instagram_adapter import ingest_instagram_mock
from src.data.youtube_adapter import ingest_youtube_comments
from src.database.database import SessionLocal
from src.database.models import Signal
from src.models.model_service import predict_post
from src.models.risk_service import calculate_risk, predict_multimodal
from src.services.alert_service import (
    get_alert,
    list_alerts,
    acknowledge_alert,
)
from src.services.analytics_service import (
    get_historical_analytics,
    get_risk_trends,
    get_platform_analytics,
    get_activity_anomalies,
    get_high_risk_anomalies,
)
from src.services.correlation_service import analyze_event_correlation
from src.services.incident_service import (
    get_incident,
    list_incidents,
    attach_signal_to_incident,
)
from src.services.intelligence_report_service import (
    generate_intelligence_report,
)


class AnalysisResponse(BaseModel):
    text_analysis: dict[str, Any]
    multimodal_analysis: dict[str, Any] | None = None


app = FastAPI(
    title="INTOCIAL API",
    description="Intelligence Operations & Social Intelligence Analysis — AI-powered social intelligence platform for detecting, correlating, and investigating emerging threats across fragmented social signals.",
    version="1.0.0",
)

app.include_router(auth_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class PostRequest(BaseModel):
    text: str


@app.get("/")
def root():
    return {
        "message": "INTOCIAL API is running"
    }


@app.post("/predict")
def predict(request: PostRequest, current_user=Depends(get_current_user)):
    return calculate_risk(request.text)


@app.post("/analyze-multimodal")
async def analyze_multimodal(
    text: str = Form(...),
    image: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    image_bytes = await image.read()

    text_risk = calculate_risk(text)

    multimodal_result = predict_multimodal(
        text,
        image_bytes,
    )

    return {
        "text_analysis": text_risk,
        "multimodal_analysis": multimodal_result,
        "image_filename": image.filename,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
    }


@app.get("/dashboard/summary")
def dashboard_summary(
    current_user=Depends(get_current_user),
):
    db = SessionLocal()

    try:
        total_signals = db.query(
            func.count(Signal.id)
        ).scalar() or 0

        informative_posts = db.query(
            func.count(Signal.id)
        ).filter(
            Signal.prediction.is_not(None)
        ).scalar() or 0

        average_risk = db.query(
            func.avg(Signal.risk_score)
        ).scalar()

        risk_rows = db.query(
            Signal.risk_level,
            func.count(Signal.id),
        ).group_by(
            Signal.risk_level
        ).all()

        risk_distribution = {
            "low": 0,
            "medium": 0,
            "high": 0,
            "critical": 0,
        }

        for risk_level, count in risk_rows:
            if risk_level:
                key = risk_level.lower()
                if key in risk_distribution:
                    risk_distribution[key] = count

        alerts = list_alerts()
        active_alerts = [
            alert for alert in alerts
            if alert.get("status", "").upper() == "OPEN"
        ]

        critical_alerts = [
            alert for alert in active_alerts
            if alert.get("severity", "").upper() == "CRITICAL"
        ]

        entity_counts = {}

        signal_entities = db.query(
            Signal.entities
        ).filter(
            Signal.entities.is_not(None)
        ).all()

        for (entities,) in signal_entities:
            if not entities:
                continue

            for entity in entities:
                if isinstance(entity, dict):
                    name = (
                        entity.get("text")
                        or entity.get("name")
                        or entity.get("entity")
                    )
                else:
                    name = str(entity)

                if name:
                    name = name.strip()
                    if name:
                        entity_counts[name] = (
                            entity_counts.get(name, 0) + 1
                        )

        top_events = [
            {
                "name": name,
                "count": count,
            }
            for name, count in sorted(
                entity_counts.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:5]
        ]

        return {
            "posts_analyzed": total_signals,
            "informative_posts": informative_posts,
            "active_alerts": len(active_alerts),
            "critical_alerts": len(critical_alerts),
            "average_risk_score": (
                round(float(average_risk), 2)
                if average_risk is not None
                else 0
            ),
            "risk_distribution": risk_distribution,
            "top_events": top_events,
        }

    finally:
        db.close()


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    text: str = Form(...),
    image: UploadFile | None = File(None),
    current_user=Depends(get_current_user),
):
    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    text_result = calculate_risk(text)

    response = {
        "text_analysis": text_result
    }

    if image is not None:
        if (
            not image.content_type
            or not image.content_type.startswith("image/")
        ):
            raise HTTPException(
                status_code=400,
                detail="Uploaded file must be an image.",
            )

        image_bytes = await image.read()

        multimodal_result = predict_multimodal(
            text,
            image_bytes,
        )

        response["multimodal_analysis"] = multimodal_result

    return response


@app.post("/ingest")
def ingest(data: dict, current_user=Depends(get_current_user)):
    platform = data.get("platform", "unknown")

    normalized = adapt_post(
        platform,
        data,
    )

    if not normalized["text"]:
        raise HTTPException(
            status_code=400,
            detail="Post text cannot be empty.",
        )

    analysis = calculate_risk(
        normalized["text"]
    )

    signal = {
        **normalized,
        **analysis,
    }

    saved_signal, is_new = save_live_signal(signal)

    return {
        "post": saved_signal
    }


@app.post("/ingest/youtube")
def ingest_youtube(video_id: str, max_results: int = 20, current_user=Depends(get_current_user)):
    if not video_id.strip():
        raise HTTPException(
            status_code=400,
            detail="YouTube video ID cannot be empty.",
        )

    if max_results < 1 or max_results > 100:
        raise HTTPException(
            status_code=400,
            detail="max_results must be between 1 and 100.",
        )

    try:
        result = ingest_youtube_comments(
            video_id.strip(),
            max_results,
        )

    except RuntimeError as error:
        print(
            "YouTube configuration error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="YouTube configuration error.",
        )

    except requests.HTTPError as error:
        print(
            "YouTube API error:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail="YouTube API request failed.",
        )

    except requests.RequestException as error:
        print(
            "YouTube connection error:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to connect to YouTube API.",
        )

    return {
        "video_id": video_id.strip(),
        **result,
    }


@app.post("/ingest/reddit")
def ingest_reddit(current_user=Depends(get_current_user)):
    try:
        return ingest_reddit_mock()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Reddit mock ingestion failed.",
        )


@app.post("/ingest/x")
def ingest_x(current_user=Depends(get_current_user)):
    try:
        return ingest_x_mock()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="X mock ingestion failed.",
        )


@app.post("/ingest/instagram")
def ingest_instagram(current_user=Depends(get_current_user)):
    try:
        return ingest_instagram_mock()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Instagram mock ingestion failed.",
        )


@app.get("/ingest/signals")
def ingested_signals(current_user=Depends(get_current_user)):
    return {
        "signals": load_live_signals()
    }


@app.get("/dashboard/signals")
def dashboard_signals(
    page: int = 1,
    limit: int = 20,
    current_user=Depends(get_current_user),
):
    if page < 1:
        page = 1

    if limit < 1:
        limit = 20

    if limit > 100:
        limit = 100

    offset = (page - 1) * limit

    dashboard_signals = load_dashboard_signals()

    live_signals = load_live_signals(
        limit=limit,
        offset=offset,
    )

    return {
        "signals": live_signals,
        "page": page,
        "limit": limit,
    }


@app.get("/live/signals")
def live_signals(
    limit: int = 20,
    offset: int = 0,
    risk_level: str | None = None,
    platform: str | None = None,
    current_user=Depends(get_current_user),
):
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 100.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="offset cannot be negative.",
        )

    if risk_level:
        risk_level = risk_level.upper()

        allowed_risk_levels = {
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        }

        if risk_level not in allowed_risk_levels:
            raise HTTPException(
                status_code=400,
                detail="Invalid risk level.",
            )

    if platform:
        platform = platform.lower()

        allowed_platforms = {
            "x",
            "reddit",
            "youtube",
            "instagram",
        }

        if platform not in allowed_platforms:
            raise HTTPException(
                status_code=400,
                detail="Invalid platform.",
            )

    signals = load_live_signals(
        limit=limit,
        offset=offset,
        risk_level=risk_level,
        platform=platform,
    )

    total = count_live_signals(
        risk_level=risk_level,
        platform=platform,
    )

    return {
        "signals": signals,
        "total": total,
    }


@app.get("/live/summary")
def live_summary(
    platform: str | None = None,
    current_user=Depends(get_current_user),
):
    if platform:
        platform = platform.lower()

        allowed_platforms = {
            "x",
            "reddit",
            "youtube",
            "instagram",
        }

        if platform not in allowed_platforms:
            raise HTTPException(
                status_code=400,
                detail="Invalid platform.",
            )

    counts = get_live_signal_counts(
        platform=platform,
    )

    return {
        "total": sum(counts.values()),
        "risk_distribution": counts,
    }


@app.get("/analytics/summary")
def analytics_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user=Depends(get_current_user),
):
    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date.",
        )

    return get_historical_analytics(
        start_date=start_date,
        end_date=end_date,
    )


@app.get("/analytics/risk-trends")
def analytics_risk_trends(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user=Depends(get_current_user),
):
    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date.",
        )

    return {
        "trends": get_risk_trends(
            start_date=start_date,
            end_date=end_date,
        )
    }


@app.get("/analytics/platforms")
def analytics_platforms(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user=Depends(get_current_user),
):
    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date.",
        )

    return {
        "platforms": get_platform_analytics(
            start_date=start_date,
            end_date=end_date,
        )
    }


@app.get("/analytics/anomalies")
def analytics_anomalies(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user=Depends(get_current_user),
):
    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date.",
        )

    return {
        "anomalies": get_activity_anomalies(
            start_date=start_date,
            end_date=end_date,
        )
    }


@app.get("/analytics/high-risk-anomalies")
def analytics_high_risk_anomalies(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user=Depends(get_current_user),
):
    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date.",
        )

    return {
        "anomalies": get_high_risk_anomalies(
            start_date=start_date,
            end_date=end_date,
        )
    }


@app.get("/incidents")
def incidents(
    current_user=Depends(get_current_user),
):
    return {
        "incidents": list_incidents()
    }


@app.get("/incidents/{incident_id}")
def incident(
    incident_id: int,
    current_user=Depends(get_current_user),
):
    result = get_incident(incident_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found.",
        )

    return result


@app.post("/incidents/{incident_id}/signals/{signal_id}")
def attach_signal(
    incident_id: int,
    signal_id: int,
    current_user=Depends(get_current_user),
):
    result = attach_signal_to_incident(
        signal_id,
        incident_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident or signal not found.",
        )

    return result


@app.get("/alerts")
def alerts(
    current_user=Depends(get_current_user),
):
    return {
        "alerts": list_alerts()
    }


@app.get("/alerts/{alert_id}")
def alert(
    alert_id: int,
    current_user=Depends(get_current_user),
):
    result = get_alert(alert_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found.",
        )

    return result


@app.post("/alerts/{alert_id}/acknowledge")
def acknowledge(
    alert_id: int,
    current_user=Depends(get_current_user),
):
    result = acknowledge_alert(alert_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found.",
        )

    return result

@app.get("/correlation/signals")
def correlation_signals(limit: int = 50, current_user=Depends(get_current_user)):
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 100.",
        )

    db = SessionLocal()

    try:
        signals = (
            db.query(Signal)
            .order_by(Signal.timestamp.desc())
            .limit(limit)
            .all()
        )

        return {
            "signals": [
                {
                    "id": signal.id,
                    "text": signal.text,
                    "platform": signal.platform,
                    "timestamp": signal.timestamp,
                    "entities": signal.entities or [],
                    "risk_level": getattr(
                        signal,
                        "risk_level",
                        None,
                    ),
                    "risk_score": getattr(
                        signal,
                        "risk_score",
                        None,
                    ),
                    "confidence": getattr(
                        signal,
                        "confidence",
                        None,
                    ),
                }
                for signal in signals
            ]
        }

    finally:
        db.close()
        
@app.post("/correlation/analyze")
def analyze_correlation(
    signal_ids: list[int],
    current_user=Depends(get_current_user),
):
    signal_ids = list(dict.fromkeys(signal_ids))

    if len(signal_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 unique signal IDs are required",
        )

    if len(signal_ids) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 signals can be analyzed at once",
        )

    db = SessionLocal()

    try:
        signals = (
            db.query(Signal)
            .filter(Signal.id.in_(signal_ids))
            .all()
        )

        found_ids = {
            signal.id
            for signal in signals
        }

        missing_ids = [
            signal_id
            for signal_id in signal_ids
            if signal_id not in found_ids
        ]

        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Signals not found: {missing_ids}",
            )

        signal_data = [
            {
                "id": signal.id,
                "text": signal.text,
                "platform": signal.platform,
                "timestamp": signal.timestamp,
                "entities": signal.entities or [],
            }
            for signal in signals
        ]

        return analyze_event_correlation(signal_data)

    finally:
        db.close()


@app.get("/incidents/{incident_id}/report")
def intelligence_report(
    incident_id: int,
    current_user=Depends(get_current_user),
):
    result = generate_intelligence_report(incident_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return result