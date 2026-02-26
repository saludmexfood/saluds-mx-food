from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel

from ..config import settings
from ..security import create_access_token

router = APIRouter(
    prefix="/admin/auth",
    tags=["Admin Auth"],
)


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login_admin(payload: LoginRequest = Body(...)):
    """
    Validate admin password and issue JWT.
    """
    if not settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin auth is not configured",
        )

    if payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token({"role": "admin"})
    return {"access_token": token}