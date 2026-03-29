# OmniSync ERP Management System (Group 2) 🚀

This repository contains the complete frontend and backend services for the **Group 2 University Demo** project. The system is entirely Dockerized and designed to integrate seamlessly with ERPNext, featuring automated application staging and data seeding.

## 🌟 Project Architecture
- **Frontend**: Next.js (TypeScript, Tailwind CSS, shadcn/ui) running on Port `3000`.
- **Backend**: FastAPI (Python, Uvicorn) serving as a microservice running on Port `8000`.
- **Database/Core**: ERPNext acts as the core backend source of truth.

## 🛠 Prerequisites for Demo
1. [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and actively running.
2. Git installed on your machine.
3. Access to an active, configured ERPNext instance (such as Frappe Framework on port 8080).

---

## 🚀 Step-by-Step Demo Instructions

### 1. Clone the Repository
Open your terminal and clone the repository to your host machine:
```bash
git clone https://github.com/PeterPatter2/Group2_Stock-And-Asset.git
cd Group2_Stock-And-Asset
```

### 2. Configure Environment Variables
Inside the `Group2_Stock-And-Asset` folder, create a `.env` file containing your ERPNext credentials. Use the following format:
```env
# Use 'host.docker.internal' to allow the Docker container to connect to ERPNext on your Mac/Host machine
ERPNEXT_URL=http://host.docker.internal:8080
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here
```

### 3. Launch the Platform
Start both the Frontend and Backend services automatically using Docker Compose. Make sure you run this from the root directory:
```bash
docker-compose up --build
```

### What happens in the background?
* **Auto-Seeding**: Before the backend server starts, the `g2_backend` container executes `seed_erpnext.py`. This script ensures that **Group 2** master data (Company, Location, Sub-categories, and Mock Items) is automatically injected into your ERPNext instance seamlessly using Idempotency principles. 
* **Backend Boot**: The FastAPI microservice will launch and accept API requests.
* **Frontend Build**: The Next.js container builds a production-ready Web App directly mapped to the containerized backend.

### 4. Access the System
Once the terminal logs confirm both containers are built and running (`g2_frontend` and `g2_backend`), open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Auto-Seeded Data Overview (Reference)
During the startup phase, the `seed_erpnext.py` script automatically stages the following data configurations required for testing:
- **Company**: Group 2 Corporation (G2)
- **Item Group**: Hardware G2
- **Asset Category**: IT_TOOLS_G2
- **Location**: Engineering Building G2
- **Warehouse**: Stores - G2
- **Items**: 
  - `APT_001_G2` (Asset Tracking Demo)
  - `STK_001_G2` (Stock/Inventory Demo)

*(If this data already exists in ERPNext, the script intelligently skips creation to prevent infinite loops and configuration errors).*
