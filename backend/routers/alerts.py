from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/")
def get_alerts(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Fetch history of all triggered priority alerts."""
    return db.query(Alert).order_by(Alert.id.desc()).offset(skip).limit(limit).all()

@router.put("/{id}/read")
def mark_alert_read(id: int, db: Session = Depends(get_db)):
    """Mark an alert as acknowledged / read by the user."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if alert:
        alert.is_read = True
        db.commit()
        return {"status": "success", "id": id}
    return {"status": "not_found"}
