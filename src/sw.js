if (!WebAssembly.instantiateStreaming) {
  // polyfill
  WebAssembly.instantiateStreaming = function (respPromise, importObject) {
    return new Promise(function (resolve, reject) {
      Promise.resolve(respPromise)
        .then(function (resp) {
          return resp.arrayBuffer();
        })
        .then(function (source) {
          return WebAssembly.instantiate(source, importObject);
        })
        .then(function (wasmExports) {
          resolve(wasmExports);
        })
        .catch(reject);
    });
  };
}

let wasmResolve;
let wasmReady = new Promise(function (resolve) {
  wasmResolve = resolve;
});

const go = new Go();
console.log("loading wasm...");
WebAssembly.instantiateStreaming(fetch("/age.wasm"), go.importObject).then(
  function (result) {
    console.log("wasm loaded! starting go runtime...");
    go.run(result.instance);
    const cancelWait = setInterval(() => {
      console.log("exports from go appear to be set, all ready!");
      if (global.age_encrypt) {
        clearInterval(cancelWait);
        wasmResolve();
      }
    }, 50);
  }
);

self.addEventListener("message", function (event) {
  switch (event.data.op) {
    case "age_generate_x25519_identity":
      wasmReady
        .then(function () {
          return age_generate_x25519_identity();
        })
        .then(function (id) {
          self.postMessage({ result: id });
        })
        .catch((err) => {
          self.postMessage({ error: new Error(`${err}`) });
        });
      break;
    case "age_encrypt":
      wasmReady
        .then(function () {
          return age_encrypt(event.data.args[0], event.data.args[1]);
        })
        .then(function (cipherText) {
          self.postMessage({ result: cipherText });
        })
        .catch((err) => {
          self.postMessage({ error: new Error(`${err}`) });
        });
      break;
    default:
  }
});
