from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import Base, engine
from . import models  # noqa: F401  (register tables)
from .routes import auth, claims, dashboard, products, receipts, reminders


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(get_settings().upload_dir).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="ClaimVault API", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    parts = []
    for e in exc.errors():
        loc = ".".join(str(x) for x in e["loc"] if x not in ("body", "query", "path"))
        msg = e["msg"].removeprefix("Value error, ")
        parts.append(f"{loc}: {msg}" if loc else msg)
    return JSONResponse(status_code=422, content={"detail": "; ".join(parts) or "Invalid request"})


for r in (auth, products, receipts, reminders, dashboard, claims):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
