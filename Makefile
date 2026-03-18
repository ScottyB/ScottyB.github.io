.PHONY: help setup serve serve-draft build build-prod clean new check-links

HUGO         := hugo
PORT         := 1313
BASE_URL     := https://scottnbarnett.com/
BUILD_DIR    := public
THEME_DIR    := themes/hugo-initio

## help: Show this help message
help:
	@echo "Usage: make <target>"
	@echo ""
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## setup: Initialise git submodules (run this first to fetch the theme)
setup:
	git submodule update --init --recursive

$(THEME_DIR)/layouts:
	@echo "Theme not found. Running 'make setup' first..."
	@$(MAKE) setup

## serve: Start local dev server with live reload (http://localhost:1313)
serve: $(THEME_DIR)/layouts
	$(HUGO) server --port $(PORT) --buildFuture --disableFastRender

## build: Build the site into ./public
build: $(THEME_DIR)/layouts
	$(HUGO) --buildFuture --cleanDestinationDir

## build-prod: Build the site for production with minification
build-prod:
	$(HUGO) --minify --baseURL $(BASE_URL) --cleanDestinationDir

## new: Create a new post — usage: make new NAME=my-post-title
new:
ifndef NAME
	$(error NAME is required. Usage: make new NAME=my-post-title)
endif
	$(HUGO) new posts/$(NAME).md

## check: Run hugo's built-in checks (unused content, template issues)
check:
	$(HUGO) --templateMetrics --templateMetricsHints --buildDrafts --buildFuture 2>&1 | grep -E "(WARN|ERROR|warn|error)" || echo "No warnings or errors found."

## clean: Remove the generated build directory
clean:
	rm -rf $(BUILD_DIR)
