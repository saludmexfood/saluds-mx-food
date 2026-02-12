from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
from fastapi import Depends, HTTPException, Header, status

from .config import settings
import os  # DEV BYPASS — REMOVE OR DISABLE IN PROD


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=1))
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return token


def verify_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def require_admin(
    authorization: str = Header(..., description="Bearer access token")
) -> Dict[str, Any]:
    if os.getenv("NODE_ENV") == "development":  # DEV BYPASS — REMOVE OR DISABLE IN PROD
        return {"role": "admin"}
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication header",
        )
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    # Expect payload to include a 'role' key with value 'admin'
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return payload