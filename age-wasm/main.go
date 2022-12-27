package main

import (
	"bytes"
	"fmt"
	"io"
	"runtime/debug"
	"strings"
	"syscall/js"

	"filippo.io/age"
	"filippo.io/age/armor"
)

func promise(fn func() (js.Value, error)) js.Value {
	var handler js.Func
	handler = js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		go func() {
			defer handler.Release()
			resolve, reject := args[0], args[1]
			result, err := fn()
			if err != nil {
				reject.Invoke(jsError(err))
			} else {
				resolve.Invoke(result)
			}
		}()
		return nil
	})
	return js.Global().Get("Promise").New(handler)
}

func jsError(err error) js.Value {
	return js.Global().Get("Error").New(err.Error())
}

func isArray(v js.Value) bool {
	return js.Global().Get("Array").Get("isArray").Invoke(v).Bool()
}

func arrayIterate(v js.Value, fn func(js.Value) bool) {
	for i := 0; i < int(v.Get("length").Float()); i++ {
		if !fn(v.Index(i)) {
			return
		}
	}
}

func jsArrayToStringSlice(arr js.Value) []string {
	out := []string{}
	arrayIterate(arr, func(i js.Value) bool {
		if i.Type() != js.TypeString {
			panic(fmt.Sprintf("jsArrayToStringSlice: unexpected value type in array: %s", i.Type()))
		}
		out = append(out, i.String())
		return true
	})
	return out
}

func checkArrayElementType(v js.Value, fn func(js.Value) bool) bool {
	ok := true
	arrayIterate(v, func(v js.Value) bool {
		if !fn(v) {
			ok = false
			return false
		}
		return true
	})
	return ok
}

func printAgeVersion() {
	bi, ok := debug.ReadBuildInfo()
	if !ok {
		fmt.Println("printAgeVersion: error: failed to read build info")
		return
	}
	for _, d := range bi.Deps {
		if d.Path == "filippo.io/age" {
			fmt.Printf("filippo.io/age: version %s (sum: %s)\n", d.Version, d.Sum)
			return
		}
	}
	fmt.Println("printAgeVersion: error: did not find filippo.io/age module")
}

func main() {
	fmt.Println("go initializaing...")
	printAgeVersion()
	// declare function age_generate_x25519_identity(): Promise<[string, string]>
	exports := js.Global().Get("Object").New()
	exports.Set("generate_x25519_identity", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(func() (js.Value, error) {
			if len(args) != 0 {
				return js.Undefined(), fmt.Errorf("expected 0 arguments, got %d", len(args))
			}
			id, err := age.GenerateX25519Identity()
			if err != nil {
				return js.Undefined(), err
			}
			a := js.Global().Get("Array").New()
			a.Call("push", js.ValueOf(id.String()), js.ValueOf(id.Recipient().String()))
			return a, nil
		})
	}))
	exports.Set("decrypt", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(
			func() (js.Value, error) {
				if len(args) != 2 {
					return js.Undefined(), fmt.Errorf("expected 2 arguments, got %d", len(args))
				} else if t := args[0].Type(); t != js.TypeString {
					return js.Undefined(), fmt.Errorf("expected argument 1 to be a string, got %s", t.String())
				} else if t := args[1].Type(); t != js.TypeString {
					return js.Undefined(), fmt.Errorf("expected argument 2 to be a string, got %s", t.String())
				}
				armortxt := strings.NewReader(args[0].String())
				id, err := age.ParseX25519Identity(args[1].String())
				if err != nil {
					return js.Undefined(), fmt.Errorf("failed to parse private key: %s", err.Error())
				}
				ar := armor.NewReader(armortxt)
				ptr, err := age.Decrypt(ar, id)
				if err != nil {
					return js.Undefined(), fmt.Errorf("failed to decrypt text: %s", err.Error())
				}
				ptbytes, err := io.ReadAll(ptr)
				if err != nil {
					return js.Undefined(), fmt.Errorf("failed to read decrypted text: %s", err.Error())
				}
				return js.ValueOf(string(ptbytes)), nil
			},
		)
	}))
	exports.Set("encrypt", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(func() (js.Value, error) {
			if len(args) != 2 {
				return js.Undefined(), fmt.Errorf("expected 2 arguments, got %d", len(args))
			} else if t := args[0].Type(); t != js.TypeString {
				return js.Undefined(), fmt.Errorf("expected argument 1 to be a string, got %s", t.String())
			} else if !isArray(args[1]) || !checkArrayElementType(args[1], func(v js.Value) bool { return v.Type() == js.TypeString }) {
				t := args[1].Type()
				return js.Undefined(), fmt.Errorf("expected argument 2 to be an array of strings, got %s", t.String())
			}
			plaintext := strings.NewReader(args[0].String())
			recipientsTxt := jsArrayToStringSlice(args[1])
			recipients := []age.Recipient{}
			for i, r := range recipientsTxt {
				rec, err := age.ParseX25519Recipient(r)
				if err != nil {
					return js.Undefined(), fmt.Errorf("recipient #%d could not be parsed as an age public key: %s", i+1, err.Error())
				}
				recipients = append(recipients, rec)
			}
			var ciphertext bytes.Buffer
			w, err := age.Encrypt(&ciphertext, recipients...)
			if err != nil {
				return js.Undefined(), fmt.Errorf("failed to start age writer: %s", err.Error())
			}
			if _, err := plaintext.WriteTo(w); err != nil {
				return js.Undefined(), fmt.Errorf("failed to write to age encryptor: %s", err.Error())
			}
			if err := w.Close(); err != nil {
				return js.Undefined(), fmt.Errorf("failed to close age encryptor: %s", err.Error())
			}
			var armorTxt bytes.Buffer
			aw := armor.NewWriter(&armorTxt)
			if _, err := ciphertext.WriteTo(aw); err != nil {
				return js.Undefined(), fmt.Errorf("failed to write to age armor: %s", err.Error())
			}
			if err := aw.Close(); err != nil {
				return js.Undefined(), fmt.Errorf("failed to write to age armor: %s", err.Error())
			}
			return js.ValueOf(armorTxt.String()), nil
		})
	}))
	js.Global().Set("age", exports)
	js.Global().Get("wasmResolve").Invoke()

	var neverEnding chan struct{}
	<-neverEnding
}
