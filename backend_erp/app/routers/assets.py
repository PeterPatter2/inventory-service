from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from datetime import date, datetime
import os
from app.config import settings

# ==========================================
# Pydantic Models (โครงสร้างข้อมูลที่รับจาก Frontend)
# ==========================================
class AssetCreateRequest(BaseModel):
    item_code: str
    asset_name: str
    location: str
    company: str = "Khon Kaen University" # ต้องใส่ชื่อ Company ให้ตรงกับใน ERPNext
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
# API Router
# ==========================================
router = APIRouter(prefix="/api", tags=["Assets"])

def get_headers():
    return {
        "Authorization": settings.auth_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

# 1. READ: ดึงรายการทรัพย์สินทั้งหมด
@router.get("/assets")
async def get_assets():
    fields = '["name", "asset_name", "status", "location", "item_code", "docstatus", "gross_purchase_amount", "value_after_depreciation"]'
    url = f"{settings.erpnext_url}/api/resource/Asset?fields={fields}&limit_page_length=200"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers())
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data", [])

# 1.1 READ: ดึงรายละเอียดทรัพย์สินรายตัว (รวมตารางค่าเสื่อม)
@router.get("/assets/{asset_id}")
async def get_asset_detail(asset_id: str):
    url = f"{settings.erpnext_url}/api/resource/Asset/{asset_id}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers())
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data", {})

# 2. READ: ดึงรายการ Location ทั้งหมด
@router.get("/locations")
async def get_locations():
    fields = '["name", "location_name"]'
    url = f"{settings.erpnext_url}/api/resource/Location?fields={fields}&limit_page_length=200"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=get_headers())
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data", [])

# 3. CREATE: ขึ้นทะเบียนทรัพย์สินใหม่ + ยืนยันทันที (Auto-Submit)
@router.post("/assets/create")
async def create_asset(request: AssetCreateRequest):
    url_create = f"{settings.erpnext_url}/api/resource/Asset"
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
        # สเตปที่ 1: สร้าง Draft
        res_create = await client.post(url_create, headers=get_headers(), json=payload_create)
        if res_create.status_code != 200:
            raise HTTPException(status_code=res_create.status_code, detail=res_create.text)
            
        # ดึง Asset ID ที่เพิ่งสร้าง
        asset_id = res_create.json().get("data").get("name")
        
        # สเตปที่ 2: กดยืนยัน (Submit)
        url_submit = f"{settings.erpnext_url}/api/resource/Asset/{asset_id}"
        payload_submit = {"docstatus": 1}
        
        res_submit = await client.put(url_submit, headers=get_headers(), json=payload_submit)
        if res_submit.status_code != 200:
            raise HTTPException(status_code=res_submit.status_code, detail=res_submit.text)
            
        return {
            "message": "Asset created and submitted successfully", 
            "asset_id": asset_id
        }

# 3.1 SUBMIT: กดยืนยันทรัพย์สิน
@router.post("/assets/{asset_id}/submit")
async def submit_asset(asset_id: str):
    url = f"{settings.erpnext_url}/api/resource/Asset/{asset_id}"
    payload = {"docstatus": 1}
    
    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=get_headers(), json=payload)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return {"message": f"Asset {asset_id} submitted successfully"}

# 4. MOVE: ย้ายสถานที่ (Asset Movement) + Auto-Submit
@router.post("/assets/move")
async def move_asset(request: AssetMoveRequest):
    url_create = f"{settings.erpnext_url}/api/resource/Asset Movement"
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
        
        url_submit = f"{settings.erpnext_url}/api/resource/Asset Movement/{movement_id}"
        payload_submit = {"docstatus": 1} 
        
        res_submit = await client.put(url_submit, headers=get_headers(), json=payload_submit)
        if res_submit.status_code != 200:
            raise HTTPException(status_code=res_submit.status_code, detail=res_submit.text)
            
        return {
            "message": "Asset moved successfully", 
            "movement_id": movement_id
        }

# 5. MAINTENANCE (Repair): ส่งซ่อมบำรุง
@router.post("/assets/repair")
async def repair_asset(request: AssetRepairRequest):
    url = f"{settings.erpnext_url}/api/resource/Asset Repair"
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

# 6. SCRAP: แทงจำหน่าย / เลิกใช้งาน
@router.put("/assets/{asset_id}/scrap")
async def scrap_asset(asset_id: str):
    url = f"{settings.erpnext_url}/api/method/erpnext.assets.doctype.asset.depreciation.scrap_asset"
    payload = {
        "asset_name": asset_id
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=get_headers(), json=payload)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json())
            
        return {"message": f"Asset {asset_id} has been scrapped successfully"}
