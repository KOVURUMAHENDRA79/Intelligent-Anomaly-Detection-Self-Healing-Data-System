from sqlalchemy.orm import Session
from ..models import Alert, Anomaly, Prediction
from .redis_service import redis_service

class AlertService:
    def process_anomaly_alert(self, db: Session, anomaly: Anomaly, data_point: dict, severity_thresholds: list = ["high", "critical"], confidence_threshold: float = 0.8):
        """Evaluate a generated anomaly. If it exceeds defined thresholds, persist and broadcast an alert."""
        if anomaly.severity in severity_thresholds or anomaly.confidence >= confidence_threshold:
            message = f"Immediate Action Required: Anomaly #{anomaly.id} flagged with {anomaly.severity.upper()} severity ({anomaly.confidence * 100:.1f}% confidence)."
            
            alert = Alert(
                anomaly_id=anomaly.id,
                channel="ui",
                message=message
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            
            # Broadcast to redis
            redis_service.publish_event({
                "type": "alert",
                "alert_id": alert.id,
                "anomaly_id": anomaly.id,
                "message": message,
                "trigger": "anomaly",
                "severity": anomaly.severity,
                "timestamp": str(alert.sent_at)
            })

    def process_prediction_alert(self, db: Session, prediction: Prediction, risk_threshold: float = 0.85):
        """Evaluate an extrapolated forecast. If future risk is exceptionally high, sound an early-warning alert."""
        if prediction.predicted_probability >= risk_threshold:
            message = f"Early Warning: Future risk flagged at {prediction.predicted_probability * 100:.1f}%. Spike projected around {prediction.target_timestamp.strftime('%H:%M:%S')}."
            
            # Note: prediction might not link directly to anomaly_id since it hasn't happened yet
            alert = Alert(
                channel="ui",
                message=message
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            
            # Broadcast to redis
            redis_service.publish_event({
                "type": "alert",
                "alert_id": alert.id,
                "message": message,
                "trigger": "prediction",
                "severity": "high",
                "timestamp": str(alert.sent_at)
            })

alert_service = AlertService()
