public/age.wasm: $(wildcard age-wasm/*.go)
	GOOS=js GOARCH=wasm go build -o $@ ./age-wasm

public/sw.js: src/sw.js
	cat "$(shell go env GOROOT)/misc/wasm/wasm_exec.js" $< > $@
