from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from datetime import date, datetime

# ==========================================
# 1. ตั้งค่าการเชื่อมต่อ ERPNext
# ==========================================
ERP_URL = "http://localhost:8080"
API_KEY = "fd20a041c791062"
API_SECRET = "e281390878224be"

app = FastAPI(title="Asset Lifecycle API", description="API สำหรับจัดการวงจรชีวิตทรัพย์สินใน ERPNext")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_headers():
    return {
        "Authorization": f"token {API_KEY}:{API_SECRET}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

# ==========================================
# Pydantic Models (โครงสร้างข้อมูลที่รับจาก Frontend)
# ==========================================
class AssetCreateRequest(BaseModel):
    item_code: str
    asset_name: str
    location: str
    company: str = "PSE" # ต้องใส่ชื่อ Company ให้ตรงกับใน ERPNext
    gross_purchase_amount: float
    purchase_date: str = date.today().isoformat()
    available_for_use_date: str = date.today().isoformat()

class AssetMoveRequest(BaseModel):
    asset_id: str # ชื่อ ID ทรัพย์สิน
    target_location: str

class AssetRepairRequest(BaseModel):
    asset_id: str
    description: str

# ==========================================
# API Endpoints (Asset Lifecycle)
# ==========================================

# 1. READ: ดึงรายการทรัพย์สินทั้งหมด
@app.get("/api/assets")
async def get_assets():
    fields = '["name", "asset_name", "status", "location", "item_code"]'
    url = f"{ERP_URL}/api/resource/Asset?fields={fields}&limit_page_length=100"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers())
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
# 2. READ: ดึงรายการ Location ทั้งหมด
@app.get("/api/locations")
async def get_locations():
    fields = '["name", "location_name"]'
    url = f"{ERP_URL}/api/resource/Location?fields={fields}&limit_page_length=200"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers())
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data", [])

# 3. CREATE: ขึ้นทะเบียนทรัพย์สินใหม่ + อนุมัติใช้งานทันที (Auto-Submit)
@app.post("/api/assets/create")
async def create_asset(request: AssetCreateRequest):
    # สเตปที่ 1: สร้าง Draft
    url_create = f"{ERP_URL}/api/resource/Asset"
    payload_create = {
        "item_code": request.item_code,
        "asset_name": request.asset_name,
        "location": request.location,
        "company": request.company,
        "is_existing_asset": 1,
        "gross_purchase_amount": request.gross_purchase_amount,
        "purchase_date": request.purchase_date,
        "available_for_use_date": request.available_for_use_date
    }
    
    async with httpx.AsyncClient() as client:
        res_create = await client.post(url_create, headers=get_headers(), json=payload_create)
        if res_create.status_code != 200:
            raise HTTPException(status_code=res_create.status_code, detail=res_create.text)
            
        # ดึง Asset ID ที่เพิ่งสร้าง
        asset_id = res_create.json().get("data").get("name")
        
        # สเตปที่ 2: กดยืนยัน (Submit)
        url_submit = f"{ERP_URL}/api/resource/Asset/{asset_id}"
        payload_submit = {"docstatus": 1}
        
        res_submit = await client.put(url_submit, headers=get_headers(), json=payload_submit)
        if res_submit.status_code != 200:
            raise HTTPException(status_code=res_submit.status_code, detail=res_submit.text)
            
        return {
            "message": "Asset created and submitted successfully", 
            "asset_id": asset_id
        }

# 3. MOVE: ย้ายสถานที่ (Asset Movement) + Auto-Submit
@app.post("/api/assets/move")
async def move_asset(request: AssetMoveRequest):
    url_create = f"{ERP_URL}/api/resource/Asset Movement"
    payload_create = {
        "purpose": "Transfer",
        "transaction_date": datetime.now().isoformat(),
        "assets": [{"asset": request.asset_id, "target_location": request.target_location}]
    }
    
    async with httpx.AsyncClient() as client:
        res_create = await client.post(url_create, headers=get_headers(), json=payload_create)
        if res_create.status_code != 200:
            raise HTTPException(status_code=res_create.status_code, detail=res_create.text)
        
        movement_id = res_create.json().get("data").get("name")
        
        url_submit = f"{ERP_URL}/api/resource/Asset Movement/{movement_id}"
        payload_submit = {"docstatus": 1} 
        
        res_submit = await client.put(url_submit, headers=get_headers(), json=payload_submit)
        if res_submit.status_code != 200:
            raise HTTPException(status_code=res_submit.status_code, detail=res_submit.text)
            
        return {
            "message": "Asset moved successfully", 
            "movement_id": movement_id
        }

# 5. MAINTENANCE (Repair): ส่งซ่อมบำรุง
@app.post("/api/assets/repair")
async def repair_asset(request: AssetRepairRequest):
    url = f"{ERP_URL}/api/resource/Asset Repair"
    payload = {
        "asset": request.asset_id,
        "repair_status": "Pending",
        "failure_date": date.today().isoformat(),
        "description": request.description
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=get_headers(), json=payload)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return {"message": "Asset sent to maintenance"}

"""
# 6. SCRAP: แทงจำหน่าย / เลิกใช้งาน
@app.put("/api/assets/{asset_id}/scrap")
async def scrap_asset(asset_id: str):
    # ใน ERPNext การ Scrap ทำได้หลายวิธี แต่วิธีที่ง่ายที่สุดคือการอัปเดต Status โดยตรง 
    # (หากตั้งค่าบัญชีไว้เป๊ะๆ อาจจะต้องเรียกใช้ฟังก์ชันเฉพาะของ ERPNext)
    url = f"{ERP_URL}/api/resource/Asset/{asset_id}"
    payload = {"status": "Scrapped"}
    
    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=get_headers(), json=payload)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return {"message": f"Asset {asset_id} has been scrapped"}
"""

@app.put("/api/assets/{asset_id}/scrap")
async def scrap_asset(asset_id: str):
    # เปลี่ยน URL จาก /api/resource/ ไปชี้ที่ Python Method ของ ERPNext โดยตรง
    url = f"{ERP_URL}/api/method/erpnext.assets.doctype.asset.depreciation.scrap_asset"
    
    # Payload สำหรับ Method นี้ มักจะต้องการแค่ชื่อ Asset 
    # (หรือถ้า ERPNext บังคับใส่วันที่แทงจำหน่าย ก็ส่ง date เข้าไปเพิ่มได้ครับ)
    payload = {
        "asset_name": asset_id
    }
    
    async with httpx.AsyncClient() as client:
        # สังเกตว่าเราใช้ .post() สำหรับการเรียกใช้งาน Method นะครับ ไม่ใช่ .put()
        response = await client.post(url, headers=get_headers(), json=payload)
        
        if response.status_code != 200:
            # ถ้ามี Error ระบบจะพ่นกลับมา เช่น ใส่วันที่ย้อนหลังไม่ได้ ฯลฯ
            raise HTTPException(status_code=response.status_code, detail=response.json())
            
        return {"message": f"Asset {asset_id} has been scrapped successfully"}