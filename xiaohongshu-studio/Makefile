.PHONY: test lint install validate render clean help

# === 小红书图文工厂 v1.3.4 ===

help:
	@echo "Targets:"
	@echo "  make install              Install Python deps (python-pptx, jsonschema, pytest)"
	@echo "  make test                 Run pytest unit tests"
	@echo "  make validate             Run scripts/validate.py (frontmatter + JSON + schedule)"
	@echo "  make validate-skills      Run scripts/validate_skill_outputs.py (md refs + schema)"
	@echo "  make render               Auto-generate schedule tables from references/schedule.json"
	@echo "  make migrate-episode-ids  Apply M27 migration (config.series → series_context)"
	@echo "  make migrate-dry-run      Dry-run M27 migration"
	@echo "  make lint                 Static checks (placeholder for future)"
	@echo "  make clean                Remove __pycache__ + .pytest_cache"

install:
	python3 -m pip install --user --quiet python-pptx jsonschema pytest

test:
	python3 -m pytest tests/ -v

validate:
	python3 scripts/validate.py

validate-skills:
	python3 scripts/validate_skill_outputs.py

migrate-episode-ids:
	python3 scripts/migrate_v1_3_to_v1_4.py --apply

migrate-dry-run:
	python3 scripts/migrate_v1_3_to_v1_4.py --dry-run

render:
	python3 scripts/render_schedule_tables.py

lint:
	@echo "(lint placeholder — no linter configured yet)"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "cleaned"
