

### Docker Setup
- Docker Desktop for Windows
- Docker Compose

## Local Setup (Windows)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/tcarp-app.git
cd tcarp-app
```

### 2. Backend Setup

#### Create Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```


#### Environment Configuration
Create a `.env` file in the `backend` directory and copy paste this:
```env
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=local
POSTGRES_HOST=localhost
POSTGRES_PORT=5433

REDIS_URL=redis://localhost:6379/0

```

#### Run Backend
```bash
cd backend
uvicorn main:app --reload
```
The backend will be available at `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`

## Docker Setup

### 1. Build and Run with Docker Compose

Create a `docker-compose.yml` file in the root directory:


### 2. Run with Docker Compose
```bash


# Build and start containers
docker-compose up --build

# Stop containers
docker-compose down
```

### Common Issues

1. **PostgreSQL Connection Error**
   - Verify PostgreSQL service is running
   - Check credentials in `.env` file
   - Ensure database exists

2. **Redis Connection Error**
   - Redis is optional, remove REDIS_URL from .env if not using
   - Verify Redis service is running if enabled

3. **Python Package Issues**
   - Try creating a fresh virtual environment
   - Update pip: `python -m pip install --upgrade pip`
   - Install packages one by one if bulk install fails

4. **Docker Issues**
   - Ensure Docker Desktop is running
   - Check Docker logs: `docker-compose logs`
   - Try rebuilding: `docker-compose up --build --force-recreate`
