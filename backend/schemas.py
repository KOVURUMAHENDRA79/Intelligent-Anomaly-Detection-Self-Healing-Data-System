from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

# Dataset 
class DatasetResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    status: str
    model_config = ConfigDict(from_attributes=True)

# DataPoint
class DataPointBase(BaseModel):
    features: Dict[str, float]
    is_anomaly: bool = False

class DataPointResponse(DataPointBase):
    id: int
    timestamp: datetime
    dataset_id: Optional[int]
    model_config = ConfigDict(from_attributes=True)

# Anomaly Event
class AnomalyEventBase(BaseModel):
    confidence_score: float
    shap_values: Dict[str, Any]
    root_cause_analysis: Optional[str] = None
    resolved: bool = False

class AnomalyEventResponse(AnomalyEventBase):
    id: int
    timestamp: datetime
    data_point_id: int
    data_point: Optional[DataPointResponse] = None
    model_config = ConfigDict(from_attributes=True)

class ConfidenceScoreResponse(BaseModel):
    anomaly_id: int
    confidence_score: float

class RootCauseResponse(BaseModel):
    anomaly_id: int
    primary_cause: str
    secondary_causes: List[str]
    confidence_per_cause: Dict[str, float]
    evidence_used: Dict[str, Any]
    plain_english_explanation: str

class ExplanationResponse(BaseModel):
    anomaly_id: int
    explanation_summary: str
    feature_contributions: Dict[str, float]
    ranked_contributing_factors: List[Dict[str, Any]]
    root_cause_analysis: Dict[str, Any]
    model_config = ConfigDict(from_attributes=True)

# Chat
class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[ChatMessageResponse] = []
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: int

# Report
class ReportResponse(BaseModel):
    id: int
    created_at: datetime
    title: str
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    html_content: Optional[str] = None
    generated_by: str
    model_config = ConfigDict(from_attributes=True)

# Feedback
class FeedbackCreate(BaseModel):
    anomaly_id: Optional[int] = None
    rating: int = Field(ge=1, le=5)
    comments: str

class FeedbackResponse(FeedbackCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Prediction
class PredictionResponse(BaseModel):
    id: int
    model_run_id: int
    target_timestamp: datetime
    predicted_probability: float
    features_used: Dict[str, Any]
    trend_direction: str
    predicted_risk_score: float
    model_config = ConfigDict(from_attributes=True)
