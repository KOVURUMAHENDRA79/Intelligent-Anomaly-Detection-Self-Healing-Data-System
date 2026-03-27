from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserFeedback, Anomaly

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/")
def submit_feedback(rating: int, comments: str, anomaly_id: int = None, db: Session = Depends(get_db)):
    """Send user feedback regarding ML detection accuracy or system UI."""
    if anomaly_id:
        evt = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
        if not evt:
            raise HTTPException(status_code=404, detail="Anomaly event not found")
            
    db_feedback = UserFeedback(
        anomaly_id=anomaly_id,
        rating=rating,
        comments=comments
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return {"status": "Feedback submitted successfully.", "id": db_feedback.id}
