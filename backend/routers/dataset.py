from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Dataset, DatasetRow, Anomaly, AnomalyExplanation, ModelRun
from ..schemas import DatasetResponse
import pandas as pd
import io

router = APIRouter(prefix="/dataset", tags=["Dataset"])

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads a CSV dataset, cleans it, and persists rows sequentially."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
        
    # Check if empty
    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty.")
        
    dataset = Dataset(filename=file.filename, status="uploaded")
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    # Store into DatasetRow bulk objects
    # This prepares the data structurally enabling both batch and stream analysis methodologies.
    rows_to_insert = []
    # Dump missing to None for JSON parsing
    df = df.where(pd.notnull(df), None)
    
    for _, series in df.iterrows():
        features_dict = series.to_dict()
        rows_to_insert.append(DatasetRow(dataset_id=dataset.id, features=features_dict))
        
    db.bulk_save_objects(rows_to_insert)
    db.commit()
    
    return dataset

@router.post("/process/{dataset_id}")
async def process_dataset_anomaly_detection(dataset_id: int, db: Session = Depends(get_db)):
    """Triggers end-to-end ML pipeline against an uploaded dataset, scoring anomalies to database."""
    from ..services.ml_service import ml_service
    from ..services.redis_service import redis_service
    from ..services.openai_service import openai_service
    from ..services.rca_service import rca_analyzer
    from ..services.alert_service import alert_service
    from .predictions import generate_forecast
    
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    rows = db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id).all()
    if not rows:
        raise HTTPException(status_code=400, detail="No streaming rows found in dataset buffer.")
        
    dataset.status = "processing"
    
    # Registering a model run context
    model_run = ModelRun(dataset_id=dataset_id, model_version="IsolationForest-v1", status="running")
    db.add(model_run)
    db.commit()
    db.refresh(model_run)
    
    anomalies_detected = 0
    results = []
    
    for i, row in enumerate(rows):
        # Re-usable pipeline
        is_anomaly, score, severity, confidence, shap_vals = ml_service.predict(row.features)
        
        if is_anomaly:
            anomalies_detected += 1
            
            # Fetch a historical baseline window (last 50 rows, bounds checked)
            start_idx = max(0, i - 50)
            baseline_rows = [r.features for r in rows[start_idx:i]]
            
            # Data-Driven Root Cause Analysis
            rca_output = rca_analyzer.analyze(
                anomaly_features=row.features, 
                baseline_history=baseline_rows, 
                shap_values=shap_vals
            )
            
            import json
            rca_json_string = json.dumps(rca_output)
            
            anomaly = Anomaly(
                row_id=row.id,
                model_run_id=model_run.id,
                severity=severity,
                confidence=confidence,
                status="active"
            )
            db.add(anomaly)
            db.commit()
            db.refresh(anomaly)
            
            expl = AnomalyExplanation(
                anomaly_id=anomaly.id,
                shap_values=shap_vals,
                generated_root_cause=rca_json_string
            )
            db.add(expl)
            db.commit() # ensure ID availability for related querying
            
            # Emit live alert if conditions are met
            alert_service.process_anomaly_alert(db, anomaly, row.features)
            
            # Form final output logic to alert via pub/sub instantly
            payload = {
                "type": "anomaly",
                "anomaly_id": anomaly.id,
                "dataset_id": dataset_id,
                "score": score,
                "severity": severity,
                "confidence": confidence,
                "shap_values": shap_vals
            }
            results.append(payload)
            redis_service.publish_event(payload)

    dataset.status = "completed"
    model_run.status = "completed"
    model_run.anomalies_detected = anomalies_detected
    db.commit()
    
    # Trigger future forecasting bounds directly on the processed telemetry
    try:
        forecast_metrics = generate_forecast(dataset_id=dataset_id, periods_ahead=5, db=db)
    except Exception as e:
        forecast_metrics = {"error": str(e)}
    
    return {
        "message": "Pipeline processing complete", 
        "total_rows": len(rows),
        "anomalies_detected": anomalies_detected,
        "forecast_metrics": forecast_metrics,
        "results": results
    }
