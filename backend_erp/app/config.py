"""
Application settings — reads from main.py's constants for consistency.
"""

from dataclasses import dataclass


@dataclass
class Settings:
    erpnext_url: str = "http://localhost:8080"
    auth_token: str = "token fd20a041c791062:e281390878224be"


settings = Settings()
