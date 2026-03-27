from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Dataset, DatasetRow, ModelRun, Prediction
from ..schemas import PredictionResponse
from ..services.forecasting_service import forecasting_service
from ..services.ml_service import ml_service
from ..services.alert_service import alert_service

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.post("/forecast/{dataset_id}")
def generate_forecast(dataset_id: int, periods_ahead: int = 5, db: Session = Depends(get_db)):
    """Run future extrapolation on recent dataset behavior and score future anomalies."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    rows = db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id).order_by(DatasetRow.timestamp.asc()).all()
    if len(rows) < 10:
        raise HTTPException(status_code=400, detail="Insufficient history. Need at least 10 rows to forecast.")
        
    history = [{"features": r.features, "timestamp": r.timestamp} for r in rows]
    
    # 1. Extrapolate features
    try:
        forecast_data = forecasting_service.forecast_dataset(history, periods_ahead)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    extrapolated_features = forecast_data["extrapolated_features"]
    trend_direction = forecast_data["trend_direction"]
    base_timestamp = forecast_data["base_timestamp"]
    freq = forecast_data["frequency"]
    
    # 2. Score future features through the ML model
    model_run = db.query(ModelRun).filter(ModelRun.dataset_id == dataset_id).order_by(ModelRun.id.desc()).first()
    if not model_run:
        # Create a mock run if processing hasn't occurred
        model_run = ModelRun(dataset_id=dataset_id, model_version="Forecast-v1", status="completed")
        db.add(model_run)
        db.commit()
        db.refresh(model_run)

    predictions = []
    max_risk = 0.0
    
    for k, future_features in enumerate(extrapolated_features):
        target_time = base_timestamp + freq * (k + 1)
        
        # Run isolated anomaly scoring on future extrapolated point!
        is_anomaly, score, severity, confidence, shap_vals = ml_service.predict(future_features)
        
        pred = Prediction(
            model_run_id=model_run.id,
            target_timestamp=target_time,
            predicted_probability=confidence,
            features_used=future_features
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
        
        # Fire early-warning alert if confidence is extreme locally
        alert_service.process_prediction_alert(db, pred)
        
        max_risk = max(max_risk, confidence)
        
        # For the active API response mapping format requested
        predictions.append({
            "target_timestamp": target_time,
            "predicted_probability": confidence,
            "features_used": future_features,
            "severity_expected": severity
        })
        
    db.commit()
    
    # Generate the aggregate prediction packet
    last_pred_obj = db.query(Prediction).filter(Prediction.model_run_id == model_run.id).order_by(Prediction.id.desc()).first()
    
    # Return aggregated prediction meta specifically matching requirements
    return {
        "dataset_id": dataset_id,
        "predicted_risk_score": float(max_risk),
        "predicted_anomaly_window": f"{base_timestamp + freq} to {base_timestamp + freq * periods_ahead}",
        "trend_direction": trend_direction,
        "confidence_score": float(max(0, 1.0 - (max_risk * 0.1))), # Model confidence in forecast vs risk probability difference
        "predictions": predictions
    }
