.PHONY: install dev dev-frontend dev-analyzer dev-sentinel dev-agents build clean

install:
	npm install
	cd backend/sentinel && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd backend/agents && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt

# Run the full stack: frontend (5173) + analyzer Express (3001) + Sentinel FastAPI (8000) + Agents FastAPI (8001)
dev:
	npx concurrently -k -n frontend,analyzer,sentinel,agents -c blue,green,magenta,cyan \
		"npm run dev -w frontend" \
		"npm run dev -w analyzer" \
		"cd backend/sentinel && ./venv/bin/python main.py" \
		"cd backend/agents && ./venv/bin/uvicorn main:app --port 8001 --reload"

dev-frontend:
	npm run dev -w frontend

dev-analyzer:
	npm run dev -w analyzer

dev-sentinel:
	cd backend/sentinel && ./venv/bin/python main.py

dev-agents:
	cd backend/agents && ./venv/bin/uvicorn main:app --port 8001 --reload

build:
	npm run build

clean:
	rm -rf frontend/dist backend/analyzer/dist backend/shared/dist
