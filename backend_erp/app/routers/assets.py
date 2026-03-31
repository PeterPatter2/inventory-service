from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Tuple
import httpx
from datetime import date, datetime
import os
import json
from app.config import settings

# ==========================================
# Pydantic Models (โครงสร้างข้อมูลที่รับจาก Frontend)
# ==========================================
class FinanceBookItem(BaseModel):
    finance_book: Optional[str] = ""
    depreciation_method: str
    frequency_of_depreciation: int
    total_number_of_depreciations: int
    expected_value_after_useful_life: float
    depreciation_start_date: str

class AssetCreateRequest(BaseModel):
    item_code: str
    asset_name: str
    location: str
    company: str = "Group 2 Corporation" # ต้องใส่ชื่อ Company ให้ตรงกับใน ERPNext
    gross_purchase_amount: float
    purchase_date: str = date.today().isoformat()
    available_for_use_date: str = date.today().isoformat()
    calculate_depreciation: int = 0
    finance_books: Optional[List[FinanceBookItem]] = []

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


def _parse_iso_date(value: str) -> date:
    try:
        return datetime.fromisoformat(value).date()
    except Exception:
        return date.today()


def _pick_date_in_active_fiscal_year(
    requested_date: date,
    active_ranges: List[Tuple[date, date]],
) -> date:
    if not active_ranges:
        return requested_date

    for start, end in active_ranges:
        if start <= requested_date <= end:
            return requested_date

    today = date.today()
    for start, end in active_ranges:
        if start <= today <= end:
            return today

    latest_start, latest_end = max(active_ranges, key=lambda r: r[0])
    return latest_start if latest_start <= latest_end else requested_date


def _is_date_in_active_fiscal_year(
    requested_date: date,
    active_ranges: List[Tuple[date, date]],
) -> bool:
    for start, end in active_ranges:
        if start <= requested_date <= end:
            return True
    return False


def _extract_erp_error_text(response: httpx.Response) -> str:
    try:
        body = response.json()
    except Exception:
        return response.text

    if isinstance(body, dict):
        detail = body.get("exception") or body.get("message") or ""
        server_messages = body.get("_server_messages")
        if isinstance(server_messages, str):
            try:
                parsed = json.loads(server_messages)
                if parsed and isinstance(parsed[0], str):
                    inner = json.loads(parsed[0])
                    detail = inner.get("message") or detail
            except Exception:
                pass
        return detail or response.text

    return response.text


def _is_fiscal_year_error(error_text: str) -> bool:
    normalized = (error_text or "").lower()
    return (
        "fiscalyearerror" in normalized
        or "not in any active fiscal year" in normalized
        or "active fiscal year" in normalized
    )


async def _get_active_fiscal_year_ranges(client: httpx.AsyncClient) -> List[Tuple[date, date]]:
    fields = '["name", "year_start_date", "year_end_date", "disabled"]'
    filters = '[["disabled", "=", 0]]'
    url = (
        f"{settings.erpnext_url}/api/resource/Fiscal Year"
        f"?fields={fields}&filters={filters}&limit_page_length=200"
    )
    res = await client.get(url, headers=get_headers())
    if res.status_code != 200:
        return []

    ranges: List[Tuple[date, date]] = []
    for row in res.json().get("data", []):
        start_raw = row.get("year_start_date")
        end_raw = row.get("year_end_date")
        if not start_raw or not end_raw:
            continue
        start_date = _parse_iso_date(start_raw)
        end_date = _parse_iso_date(end_raw)
        if start_date <= end_date:
            ranges.append((start_date, end_date))
    return ranges

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
            
        asset_data = response.json().get("data", {})
        
        # ERPNext v14+ moves 'schedules' into 'Asset Depreciation Schedule' document
        try:
            url_ads = f"{settings.erpnext_url}/api/resource/Asset Depreciation Schedule?filters=[[\"asset\",\"=\",\"{asset_id}\"]]&fields=[\"name\"]"
            ads_res = await client.get(url_ads, headers=get_headers())
            ads_data = ads_res.json().get("data", [])
            
            if ads_data:
                ads_name = ads_data[0]["name"]
                ads_detail_url = f"{settings.erpnext_url}/api/resource/Asset Depreciation Schedule/{ads_name}"
                ads_detail_res = await client.get(ads_detail_url, headers=get_headers())
                ads_detail_data = ads_detail_res.json().get("data", {})
                asset_data["schedules"] = ads_detail_data.get("depreciation_schedule", [])
            else:
                asset_data["schedules"] = asset_data.get("schedules", [])
        except Exception:
            pass 
            
        return asset_data

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

    async with httpx.AsyncClient() as client:
        active_fiscal_years = await _get_active_fiscal_year_ranges(client)

        if request.calculate_depreciation == 1 and not active_fiscal_years:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No active Fiscal Year found in ERPNext. "
                    "Please enable/create a Fiscal Year before creating depreciable assets."
                ),
            )

        purchase_date_obj = _parse_iso_date(request.purchase_date)
        available_date_obj = _parse_iso_date(request.available_for_use_date)

        if request.calculate_depreciation == 1:
            if not _is_date_in_active_fiscal_year(purchase_date_obj, active_fiscal_years):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "FISCAL_YEAR_ERROR",
                        "message": "Asset date is outside active Fiscal Year.",
                        "hint": "Adjust purchase/depreciation dates or configure Fiscal Year in ERPNext.",
                        "erp_message": f"Date {purchase_date_obj.strftime('%d-%m-%Y')} is not in any active Fiscal Year",
                        "field": "purchase_date",
                    },
                )

            if not _is_date_in_active_fiscal_year(available_date_obj, active_fiscal_years):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "FISCAL_YEAR_ERROR",
                        "message": "Asset date is outside active Fiscal Year.",
                        "hint": "Adjust purchase/depreciation dates or configure Fiscal Year in ERPNext.",
                        "erp_message": f"Date {available_date_obj.strftime('%d-%m-%Y')} is not in any active Fiscal Year",
                        "field": "available_for_use_date",
                    },
                )

        payload_create: dict = {
            "item_code": request.item_code,
            "asset_name": request.asset_name,
            "location": request.location,
            "company": request.company,
            "is_existing_asset": 1,
            "gross_purchase_amount": request.gross_purchase_amount,
            "purchase_date": request.purchase_date,
            "available_for_use_date": request.available_for_use_date,
            "calculate_depreciation": 1 if request.calculate_depreciation else 0
        }

        if request.calculate_depreciation == 1 and request.finance_books:
            finance_books_payload = [
                book.model_dump() if hasattr(book, "model_dump") else book.dict()
                for book in request.finance_books
            ]
            for index, book in enumerate(finance_books_payload):
                start_date_raw = book.get("depreciation_start_date", request.available_for_use_date)
                start_date = _parse_iso_date(start_date_raw)
                if not _is_date_in_active_fiscal_year(start_date, active_fiscal_years):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "code": "FISCAL_YEAR_ERROR",
                            "message": "Asset date is outside active Fiscal Year.",
                            "hint": "Adjust purchase/depreciation dates or configure Fiscal Year in ERPNext.",
                            "erp_message": f"Date {start_date.strftime('%d-%m-%Y')} is not in any active Fiscal Year",
                            "field": f"finance_books[{index}].depreciation_start_date",
                        },
                    )
            payload_create["finance_books"] = finance_books_payload

        # สเตปที่ 1: สร้าง Draft
        res_create = await client.post(url_create, headers=get_headers(), json=payload_create)
        if res_create.status_code != 200:
            response_text = _extract_erp_error_text(res_create)
            if _is_fiscal_year_error(response_text):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "FISCAL_YEAR_ERROR",
                        "message": "Asset date is outside active Fiscal Year.",
                        "hint": "Adjust purchase/depreciation dates or configure Fiscal Year in ERPNext.",
                        "erp_message": response_text,
                    },
                )
            raise HTTPException(status_code=res_create.status_code, detail=response_text)
            
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
        "company": "Group 2 Corporation",
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
        "company": "Group 2 Corporation",
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
