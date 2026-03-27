from sqlalchemy.orm import Session
from ..models import Anomaly, AnomalyExplanation, Prediction, Report
import json

def get_recent_anomalies(db: Session, limit: int = 5) -> str:
    """Retrieve the most recent anomalies detected in the system."""
    anomalies = db.query(Anomaly).order_by(Anomaly.id.desc()).limit(limit).all()
    results = [
        {
            "id": a.id, 
            "severity": a.severity, 
            "confidence": a.confidence, 
            "timestamp": str(a.timestamp),
            "status": a.status
        } for a in anomalies]
    return json.dumps(results)

def get_anomaly_explanation(db: Session, anomaly_id: int) -> str:
    """Retrieve detailed SHAP and Root Cause Analysis for a specific anomaly ID."""
    expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == anomaly_id).first()
    if not expl:
        return json.dumps({"error": f"No explanation found for anomaly {anomaly_id}"})
        
    try:
        rca_dict = json.loads(expl.generated_root_cause) if expl.generated_root_cause else {}
    except:
        rca_dict = expl.generated_root_cause

    return json.dumps({
        "anomaly_id": expl.anomaly_id,
        "shap_feature_importance": expl.shap_values,
        "root_cause": rca_dict
    })

def get_recent_predictions(db: Session, limit: int = 5) -> str:
    """Retrieve recent forecasted anomaly risks."""
    preds = db.query(Prediction).order_by(Prediction.id.desc()).limit(limit).all()
    results = [
        {
            "id": p.id,
            "target_timestamp": str(p.target_timestamp),
            "predicted_probability": p.predicted_probability,
            "extrapolated_features": p.features_used
        } for p in preds]
    return json.dumps(results)
