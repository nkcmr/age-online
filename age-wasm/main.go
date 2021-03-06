package main

import (
	"bytes"
	"fmt"
	"io"
	"strings"
	"syscall/js"

	"filippo.io/age"
	"filippo.io/age/armor"
)

func promise(fn func(resolve func(js.Value), reject func(js.Value))) js.Value {
	var handler js.Func
	handler = js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		resolve, reject := args[0], args[1]
		fn(
			func(v js.Value) {
				resolve.Invoke(v)
				handler.Release()
			},
			func(err js.Value) {
				reject.Invoke(err)
				handler.Release()
			},
		)
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

func main() {
	fmt.Println("go initializaing...")
	// declare function age_generate_x25519_identity(): Promise<[string, string]>
	exports := js.Global().Get("Object").New()
	exports.Set("generate_x25519_identity", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(
			func(resolve, reject func(js.Value)) {
				go func() {
					if len(args) != 0 {
						reject(jsError(fmt.Errorf("expected 0 arguments, got %d", len(args))))
						return
					}
					id, err := age.GenerateX25519Identity()
					if err != nil {
						reject(jsError(err))
						return
					}
					a := js.Global().Get("Array").New()
					a.Call("push", js.ValueOf(id.String()), js.ValueOf(id.Recipient().String()))
					resolve(a)
				}()
			},
		)
	}))
	exports.Set("decrypt", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(
			func(resolve, reject func(js.Value)) {
				go func() {
					if len(args) != 2 {
						reject(jsError(fmt.Errorf("expected 2 arguments, got %d", len(args))))
						return
					} else if t := args[0].Type(); t != js.TypeString {
						reject(jsError(fmt.Errorf("expected argument 1 to be a string, got %s", t.String())))
						return
					} else if t := args[1].Type(); t != js.TypeString {
						reject(jsError(fmt.Errorf("expected argument 2 to be a string, got %s", t.String())))
						return
					}
					armortxt := strings.NewReader(args[0].String())
					id, err := age.ParseX25519Identity(args[1].String())
					if err != nil {
						reject(jsError(fmt.Errorf("failed to parse private key: %s", err.Error())))
						return
					}
					ar := armor.NewReader(armortxt)
					ptr, err := age.Decrypt(ar, id)
					if err != nil {
						reject(jsError(fmt.Errorf("failed to decrypt text: %s", err.Error())))
						return
					}
					ptbytes, err := io.ReadAll(ptr)
					if err != nil {
						reject(jsError(fmt.Errorf("failed to read decrypted text: %s", err.Error())))
						return
					}
					resolve(js.ValueOf(string(ptbytes)))
					return
				}()
			},
		)
	}))
	exports.Set("encrypt", js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
		return promise(
			func(resolve, reject func(js.Value)) {
				go func() {
					if len(args) != 2 {
						reject(jsError(fmt.Errorf("expected 2 arguments, got %d", len(args))))
						return
					} else if t := args[0].Type(); t != js.TypeString {
						reject(jsError(fmt.Errorf("expected argument 1 to be a string, got %s", t.String())))
						return
					} else if !isArray(args[1]) || !checkArrayElementType(args[1], func(v js.Value) bool { return v.Type() == js.TypeString }) {
						t := args[1].Type()
						reject(jsError(fmt.Errorf("expected argument 2 to be an array of strings, got %s", t.String())))
						return
					}
					plaintext := strings.NewReader(args[0].String())
					recipientsTxt := jsArrayToStringSlice(args[1])
					recipients := []age.Recipient{}
					for i, r := range recipientsTxt {
						rec, err := age.ParseX25519Recipient(r)
						if err != nil {
							reject(jsError(fmt.Errorf("recipient #%d could not be parsed as an age public key: %s", i+1, err.Error())))
							return
						}
						recipients = append(recipients, rec)
					}
					var ciphertext bytes.Buffer
					w, err := age.Encrypt(&ciphertext, recipients...)
					if err != nil {
						reject(jsError(fmt.Errorf("failed to start age writer: %s", err.Error())))
						return
					}
					if _, err := plaintext.WriteTo(w); err != nil {
						reject(jsError(fmt.Errorf("failed to write to age encryptor: %s", err.Error())))
						return
					}
					if err := w.Close(); err != nil {
						reject(jsError(fmt.Errorf("failed to close age encryptor: %s", err.Error())))
						return
					}
					var armorTxt bytes.Buffer
					aw := armor.NewWriter(&armorTxt)
					if _, err := ciphertext.WriteTo(aw); err != nil {
						reject(jsError(fmt.Errorf("failed to write to age armor: %s", err.Error())))
						return
					}
					if err := aw.Close(); err != nil {
						reject(jsError(fmt.Errorf("failed to write to age armor: %s", err.Error())))
						return
					}
					resolve(js.ValueOf(armorTxt.String()))
				}()
			},
		)
	}))
	js.Global().Set("age", exports)
	js.Global().Get("wasmResolve").Invoke()

	var neverEnding chan struct{}
	<-neverEnding
}
