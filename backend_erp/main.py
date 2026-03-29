from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app import erpnext_client
from app.routers import stock, assets

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: สร้าง client ครั้งเดียว
    erpnext_client._client = httpx.AsyncClient(timeout=30.0)
    yield
    # Shutdown: ปิด client ให้สะอาด
    await erpnext_client._client.aclose()

app = FastAPI(
    title="Inventory & Assets Service",
    description="Microservice for Team 2 — communicates exclusively with ERPNext REST API.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────
app.include_router(stock.router)
app.include_router(assets.router)

# ── Health Check ───────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}