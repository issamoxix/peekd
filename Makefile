.PHONY: install dev dev-client dev-analyzer dev-sentinel dev-agents build clean

install:
	npm install
	cd sentinel-backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt

# Run the full stack: client (5173) + analyzer Express (3001) + Sentinel FastAPI (8000) + Agents FastAPI (8001)
dev:
	npx concurrently -k -n client,analyzer,sentinel,agents -c blue,green,magenta,cyan \
		"npm run dev -w client" \
		"npm run dev -w server" \
		"cd sentinel-backend && ./venv/bin/python main.py" \
		"cd backend && ./venv/bin/uvicorn main:app --port 8001 --reload"

dev-client:
	npm run dev -w client

dev-analyzer:
	npm run dev -w server

dev-sentinel:
	cd sentinel-backend && ./venv/bin/python main.py

dev-agents:
	cd backend && ./venv/bin/uvicorn main:app --port 8001 --reload

build:
	npm run build

clean:
	rm -rf client/dist server/dist shared/dist
