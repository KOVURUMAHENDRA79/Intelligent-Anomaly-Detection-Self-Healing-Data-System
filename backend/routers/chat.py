from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ChatSession, ChatMessage
from ..schemas import ChatRequest, ChatResponse
from ..services.openai_service import openai_service
from typing import List

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/", response_model=ChatResponse)
async def chat_with_data(request: ChatRequest, db: Session = Depends(get_db)):
    """Conversational endpoint leveraging OpenAI Functions to discuss the realtime anomaly stream."""
    
    # 1. Manage Conversational Memory (Session)
    if request.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat Session not found")
    else:
        # Auto-generate title optionally
        title = request.message[:30] + "..." if len(request.message) > 30 else request.message
        session = ChatSession(title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
        
    # 2. Persist inbound user chat
    user_msg = ChatMessage(session_id=session.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # 3. Compile linear structural history for the LLM
    db_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc()).all()
    history = []
    for m in db_messages:
        history.append({"role": m.role, "content": m.content})
        
    # 4. Trigger Native Tool-Calling Intelligence!
    reply_text = openai_service.interactive_chat_with_tools(db, history)
    
    # 5. Persist System Response
    ai_msg = ChatMessage(session_id=session.id, role="assistant", content=reply_text)
    db.add(ai_msg)
    db.commit()
    
    return {"reply": reply_text, "session_id": session.id}

@router.get("/sessions")
def get_chat_sessions(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.id.desc()).offset(skip).limit(limit).all()

@router.get("/sessions/{session_id}/messages")
def get_chat_history(session_id: int, db: Session = Depends(get_db)):
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
