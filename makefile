.PHONY: all
all: public/age.wasm public/sw.js

public/age.wasm: $(wildcard age-wasm/*.go)
	GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o $@ ./age-wasm

public/sw.js: src/sw.js
	cat "$(shell go env GOROOT)/lib/wasm/wasm_exec.js" $< > $@
