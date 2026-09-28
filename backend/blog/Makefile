.PHONY: run format lint

run:
	uvicorn apps.main:app --host 0.0.0.0 --port 8001 --reload

format:
	black apps config

lint:
	flake8 apps config
