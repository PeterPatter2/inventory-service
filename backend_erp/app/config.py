"""
Application settings — reads from main.py's constants for consistency.
"""
import os
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()

@dataclass
class Settings:
    erpnext_url: str = os.getenv("ERPNEXT_URL", "http://localhost:8080")
    # auth_token: "token API_KEY:API_SECRET"
    api_key: str = os.getenv("API_KEY", "fd20a041c791062")
    api_secret: str = os.getenv("API_SECRET", "e281390878224be")
    
    @property
    def auth_token(self) -> str:
        return f"token {self.api_key}:{self.api_secret}"

settings = Settings()
