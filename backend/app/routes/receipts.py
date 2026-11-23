import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..config import get_settings
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..dependencies.ownership import get_owned_product, get_owned_receipt
from ..models import Receipt, User
from ..schemas import ReceiptOut

router = APIRouter(prefix="/api", tags=["receipts"])

ALLOWED = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def sniff_type(data: bytes) -> Optional[str]:
    """Identify the real file type from magic bytes, never from the client-supplied name/type."""
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return None


def _user_dir(user_id: int) -> Path:
    return Path(get_settings().upload_dir) / str(user_id)


def _out(r: Receipt) -> ReceiptOut:
    return ReceiptOut(id=r.id, product_id=r.product_id, product_name=r.product.name,
                      original_filename=r.original_filename, content_type=r.content_type,
                      size_bytes=r.size_bytes, uploaded_at=r.uploaded_at)


@router.post("/products/{product_id}/receipts", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
def upload_receipt(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    product = get_owned_product(db, user, product_id)
    max_bytes = get_settings().max_upload_bytes
    original = os.path.basename((file.filename or "").replace("\\", "/")).strip()
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(415, "Only PDF, JPG and PNG files are allowed")
    data = file.file.read(max_bytes + 1)
    if len(data) == 0:
        raise HTTPException(400, "The uploaded file is empty")
    if len(data) > max_bytes:
        raise HTTPException(413, f"File is too large (maximum {max_bytes // (1024 * 1024)} MB)")
    real = sniff_type(data)
    if real is None or real != ALLOWED[ext]:
        raise HTTPException(415, "File content does not match a valid PDF, JPG or PNG file")

    stored = uuid.uuid4().hex + ext
    folder = _user_dir(user.id)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / stored
    path.write_bytes(data)
    receipt = Receipt(user_id=user.id, product_id=product.id, original_filename=original[:255] or stored,
                      stored_filename=stored, content_type=real, size_bytes=len(data))
    db.add(receipt)
    try:
        db.commit()
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    db.refresh(receipt)
    return _out(receipt)


@router.get("/receipts", response_model=list[ReceiptOut])
def list_receipts(product_id: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Receipt).where(Receipt.user_id == user.id).options(joinedload(Receipt.product)).order_by(Receipt.uploaded_at.desc(), Receipt.id.desc())
    if product_id is not None:
        q = q.where(Receipt.product_id == product_id)
    return [_out(r) for r in db.scalars(q).all()]


@router.get("/receipts/{receipt_id}/file")
def get_receipt_file(receipt_id: int, download: bool = False, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    r = get_owned_receipt(db, user, receipt_id)
    root = _user_dir(user.id).resolve()
    path = (root / r.stored_filename).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(404, "Receipt file not found")
    return FileResponse(path, media_type=r.content_type, filename=r.original_filename,
                        content_disposition_type="attachment" if download else "inline",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"})


@router.delete("/receipts/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(receipt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = get_owned_receipt(db, user, receipt_id)
    path = _user_dir(user.id) / r.stored_filename
    db.delete(r)
    db.commit()
    path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
