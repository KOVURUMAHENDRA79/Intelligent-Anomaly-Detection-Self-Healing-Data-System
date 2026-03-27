from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from ..database import get_db
from ..models import Anomaly, AnomalyExplanation, DatasetRow
from ..schemas import ExplanationResponse

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("/")
def get_anomaly_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Fetch history of all detected anomalies with nested explanation routing."""
    events = db.query(Anomaly).order_by(Anomaly.id.desc()).offset(skip).limit(limit).all()
    results = []
    
    for evt in events:
        expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == evt.id).first()
        results.append({
            "id": evt.id,
            "timestamp": evt.timestamp,
            "severity": evt.severity,
            "confidence_score": evt.confidence,
            "status": evt.status,
            "root_cause_analysis": expl.generated_root_cause if expl else None
        })
    return results

@router.get("/{id}")
def get_anomaly_details(id: int, db: Session = Depends(get_db)):
    """Detailed specific anomaly payload including SHAP mapping."""
    event = db.query(Anomaly).filter(Anomaly.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == id).first()
    row = db.query(DatasetRow).filter(DatasetRow.id == event.row_id).first()
    
    return {
        "id": event.id,
        "timestamp": event.timestamp,
        "severity": event.severity,
        "confidence_score": event.confidence,
        "status": event.status,
        "data_point": row.features if row else None,
        "shap_values": expl.shap_values if expl else None,
        "root_cause_analysis": expl.generated_root_cause if expl else None
    }

@router.get("/{id}/confidence")
def get_confidence_score(id: int, db: Session = Depends(get_db)):
    """Fetch specifically the ML confidence score for an anomaly."""
    event = db.query(Anomaly).filter(Anomaly.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return {"anomaly_id": id, "confidence_score": event.confidence, "severity": event.severity}

@router.get("/{id}/root-cause")
def get_root_cause_analysis(id: int, db: Session = Depends(get_db)):
    """Fetch the data-driven root cause for the anomaly."""
    import json
    expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == id).first()
    if not expl or not expl.generated_root_cause:
        raise HTTPException(status_code=404, detail="Anomaly Explanation not found")
        
    try:
        rca_dict = json.loads(expl.generated_root_cause)
    except:
        rca_dict = {
            "primary_cause": "Unknown",
            "secondary_causes": [],
            "confidence_per_cause": {},
            "evidence_used": {},
            "plain_english_explanation": "Error parsing RCA structural data."
        }
        
    return {
        "anomaly_id": id, 
        **rca_dict
    }

@router.get("/{id}/explanation", response_model=ExplanationResponse)
def get_anomaly_explanation(id: int, db: Session = Depends(get_db)):
    """Fetch structured SHAP explainability metrics and human readable summaries."""
    expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == id).first()
    if not expl:
        raise HTTPException(status_code=404, detail="Explanation not found for this anomaly.")
        
    shap_dict = expl.shap_values or {}
    
    # Calculate ranked factors by absolute SHAP impact
    ranked_factors = []
    if shap_dict:
        sorted_features = sorted(shap_dict.items(), key=lambda item: abs(item[1]), reverse=True)
        for rank, (feature, impact) in enumerate(sorted_features):
            ranked_factors.append({
                "rank": rank + 1,
                "feature": feature,
                "impact_value": impact,
                "absolute_importance": abs(impact)
            })
            
    top_feature = ranked_factors[0]["feature"] if ranked_factors else "Unknown"
    
    import json
    try:
        rca_dict = json.loads(expl.generated_root_cause) if expl.generated_root_cause else {}
    except:
        rca_dict = {}

    return {
        "anomaly_id": id,
        "explanation_summary": f"Anomaly detected primarily driven by deviations in {top_feature}.",
        "feature_contributions": shap_dict,
        "ranked_contributing_factors": ranked_factors,
        "root_cause_analysis": rca_dict
    }

