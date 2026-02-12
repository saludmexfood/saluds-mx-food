from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pathlib import Path
import os
import json
from datetime import datetime

from ..security import require_admin
from ..config import settings

router = APIRouter(
    tags=["Queue"],
)

# Utility to get project root
ROOT_DIR = Path(__file__).resolve().parents[2]
DRY_RUN_DIR = ROOT_DIR / "dry_run_outputs"


@router.get("/queues", response_model=Dict[str, Dict[str, Any]])
def list_queues(
    auth: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Dict[str, Any]]:
    """
    DEV BYPASS — REMOVE OR DISABLE IN PROD
    Lists available queues and their JSON files under dry_run_outputs/.
    """
    queues: Dict[str, list] = {}
    try:
        if DRY_RUN_DIR.exists() and DRY_RUN_DIR.is_dir():
            for entry in DRY_RUN_DIR.iterdir():
                if entry.is_dir() and entry.name.endswith("_queue"):
                    files = list(entry.glob("*.json"))
                    sorted_files = sorted(
                        files, key=lambda p: p.stat().st_mtime, reverse=True
                    )
                    queues[entry.name] = [f.name for f in sorted_files]
    except Exception:
        pass
    return {"queues": queues}


@router.get("/queue/get")
def get_queue_file(
    queue: str,
    file: str,
    auth: Dict[str, Any] = Depends(require_admin),
) -> Any:
    """
    Reads and returns a JSON file from dry_run_outputs/<queue>/<file>.
    """
    # Prevent path traversal
    safe_queue = queue.replace("..", "").replace("/", "").replace("\\", "")
    safe_file = file.replace("..", "").replace("/", "").replace("\\", "")
    file_path = DRY_RUN_DIR / safe_queue / safe_file
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    try:
        return json.loads(file_path.read_text())
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")


class DecisionRequest(BaseModel):
    queue: Optional[str]
    agent: Optional[str]
    file: str
    decision: str
    timestamp: Optional[str]


@router.post("/decision")
def post_decision(
    payload: DecisionRequest,
    auth: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, bool]:
    """
    Appends a decision record to dry_run_outputs/decisions/YYYYMMDD.jsonl.
    """
    decisions_dir = DRY_RUN_DIR / "decisions"
    decisions_dir.mkdir(parents=True, exist_ok=True)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    file_path = decisions_dir / f"{date_str}.jsonl"
    record = payload.dict()
    with file_path.open("a") as f:
        f.write(json.dumps(record) + os.linesep)
    return {"ok": True}