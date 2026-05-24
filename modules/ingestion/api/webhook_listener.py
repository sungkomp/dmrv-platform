from fastapi import FastAPI, Request, HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from ..ingestion_module import IngestionModule

app = FastAPI()
ingestion = IngestionModule()

# กำหนด Security scheme สำหรับ API Key (รับค่าผ่าน Header: X-API-Key)
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

# ในอนาคตสามารถเปลี่ยนเป็นเช็คกับ Database ได้
VALID_API_KEYS = {"my-secret-key-123"}

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key not in VALID_API_KEYS:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key

@app.post("/ingest/{source_type}", dependencies=[Depends(verify_api_key)])
async def handle_ingestion(source_type: str, request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # ส่งข้อมูลเข้าโมดูลหลัก
    result = ingestion.process_request(service="ingestion", action="ingest", source_type=source_type, data=data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {"status": "accepted", "details": result}
