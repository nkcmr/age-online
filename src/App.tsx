import { useEffect, useState } from "preact/hooks";
import { typeageImplementation } from "./age";

const {
  encrypt: ageEncrypt,
  decrypt: ageDecrypt,
  generateIdentity: ageGenerateX25519Identity,
} = typeageImplementation;

(globalThis as any).ageEncrypt = ageEncrypt;
(globalThis as any).ageDecrypt = ageDecrypt;
(globalThis as any).ageGenerateX25519Identity = ageGenerateX25519Identity;

const getKeyLink = (key: string): string => {
  return `https://age-online.com/?r=${key}`;
};

type KeyPair = { public: string; private: string };

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 620,
    margin: "0 auto",
    padding: "2rem 1rem",
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
    color: "#222",
  },
  h1: { fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem" },
  h2: { fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem" },
  muted: { fontSize: 12, color: "#595959" },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "1rem 1.25rem",
    marginBottom: "1.25rem",
    background: "#fff",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "0.4rem 0.6rem",
    fontSize: 14,
    fontFamily: "monospace",
  },
  inputDisabled: { background: "#f5f5f5", color: "#595959" },
  textarea: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "0.4rem 0.6rem",
    fontSize: 13,
    fontFamily: "monospace",
    resize: "vertical",
  },
  textareaReadonly: { background: "#f5f5f5", cursor: "text" },
  infoAlert: {
    background: "#e6f4ff",
    border: "1px solid #91caff",
    borderRadius: 6,
    padding: "0.6rem 0.75rem",
    marginBottom: "0.75rem",
    fontSize: 13,
  },
  label: { display: "block", fontWeight: 500, marginBottom: "0.3rem" },
  link: { color: "#0050b3", cursor: "pointer", textDecoration: "none" },
  linkDanger: { color: "#a8071a", cursor: "pointer" },
  code: {
    fontFamily: "monospace",
    background: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 3,
    padding: "0 4px",
    fontSize: 12,
  },
  segmented: {
    display: "inline-flex",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: "1rem",
  },
  segBtn: {
    padding: "0.35rem 1rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
  },
  segBtnActive: { background: "#0050b3", color: "#fff" },
  hr: { border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 1.25rem" },
  mt: { marginTop: "0.5rem" },
  mb: { marginBottom: "0.5rem" },
};

function App() {
  const [recieveMode] = useState(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.has("receive_mode");
  });
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const [pubKey, setPubKey] = useState<string[] | string>(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (recieveMode) return "";
    if (params.has("r")) return params.getAll("r");
    return "";
  });
  const [privKey, setPrivKey] = useState<string | null>(null);

  useEffect(() => {
    (globalThis as any).revealAgePrivateKey = () => privKey;
    return () => {
      delete (globalThis as any).revealAgePrivateKey;
    };
  }, [privKey]);

  const [ageError, setAgeError] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");

  useEffect(() => {
    if (!recieveMode) return;
    ageGenerateX25519Identity().then((pair) => {
      const newkp: KeyPair = { public: pair[1], private: pair[0] };
      setPubKey(newkp.public);
      setPrivKey(newkp.private);
      setMode("dec");
    });
  }, [recieveMode]);

  const [pubKeys, setPubKeys] = useState<string[]>([]);
  useEffect(() => {
    if (pubKey) {
      setPubKeys(Array.isArray(pubKey) ? pubKey : [pubKey]);
    } else {
      setPubKeys([]);
    }
  }, [pubKey]);

  useEffect(() => {
    if (mode === "enc") return;
    setAgeError("");
    if (!privKey) {
      setMode("enc");
      return;
    }
    if (ciphertext === "") {
      setAgeError("<nothing to decrypt>");
      return;
    }
    ageDecrypt({ ciphertext, privateKey: privKey })
      .then(setPlaintext)
      .catch((e) =>
        setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`),
      );
  }, [ciphertext, privKey, mode]);

  useEffect(() => {
    if (mode === "dec") return;
    setAgeError("");
    if (plaintext === "") {
      setAgeError("<nothing to encrypt>");
      return;
    }
    if (pubKeys.length === 0) {
      setAgeError("<no public key entered>");
      return;
    }
    ageEncrypt({ plaintext, recipients: pubKeys })
      .then(setCiphertext)
      .catch((e) =>
        setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`),
      );
  }, [plaintext, pubKeys, mode]);

  const isPrefilledKey = Array.isArray(pubKey);
  const [pubKeyValue, pubKeyDisabled] = ((): [string, boolean] => {
    if (isPrefilledKey) {
      return pubKey.length > 1 ? ["<multiple>", true] : [pubKey[0], true];
    }
    return [pubKey, !!privKey];
  })();

  const resultContent = ageError || (mode === "enc" ? ciphertext : plaintext);

  const [confirmDestroy, setConfirmDestroy] = useState(false);

  function destroyKey() {
    if (recieveMode) {
      globalThis.location.href = "/";
      return;
    }
    setPubKey("");
    setPrivKey(null);
    if (mode === "dec") setPlaintext("");
    setMode("enc");
    setConfirmDestroy(false);
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.h1}>
          <a
            href="https://age-encryption.org"
            target="_blank"
            rel="noreferrer noopener"
            style={s.link}
          >
            age
          </a>{" "}
          online encrypter
        </h1>
        <p style={{ margin: "0.25rem 0" }}>
          easily pass around secure data with age
        </p>
        <span style={s.muted}>
          (everything is in-browser, powered by{" "}
          <a
            target="_blank"
            rel="noopener noreferrer external"
            href="https://github.com/FiloSottile/typage/"
            style={s.link}
          >
            typage
          </a>
          , data does not go ANYWHERE)
        </span>
      </div>

      {recieveMode && (
        <div style={s.infoAlert}>
          Hello! Someone is trying to send you secure text. There are
          instructions below on how to receive and decrypt it.
        </div>
      )}

      {/* Public key */}
      <div style={s.card}>
        <h2 style={s.h2}>Public Key</h2>
        <label htmlFor="public_key" style={s.label}>
          Public key
        </label>
        <input
          id="public_key"
          type="text"
          spellcheck={false}
          autoComplete="off"
          disabled={pubKeyDisabled}
          value={pubKeyValue}
          placeholder="age1..."
          onChange={(e) => setPubKey((e.target as HTMLInputElement).value)}
          style={{ ...s.input, ...(pubKeyDisabled ? s.inputDisabled : {}) }}
        />

        {!isPrefilledKey && (
          <div style={{ marginTop: "0.5rem", fontSize: 13, color: "#555" }}>
            {pubKeys.length === 0 && (
              <span>
                Input a public key (should start with{" "}
                <code style={s.code}>age1</code>).{" "}
                {!privKey && (
                  <>
                    Or{" "}
                    <a
                      style={s.link}
                      onClick={async () => {
                        try {
                          const [keyPriv, keyPub] =
                            await ageGenerateX25519Identity();
                          setPubKey(keyPub);
                          setPrivKey(keyPriv);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      generate a public/private key pair
                    </a>
                    .
                  </>
                )}
              </span>
            )}

            {!!privKey && !confirmDestroy && (
              <a style={s.linkDanger} onClick={() => setConfirmDestroy(true)}>
                destroy key
              </a>
            )}
            {!!privKey && confirmDestroy && (
              <span
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.25rem",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#cf1322" }}>
                  Are you sure? Any encrypted data will be lost.
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {"— "}
                  <a style={s.link} onClick={destroyKey}>
                    yes
                  </a>
                  {" | "}
                  <a
                    style={{ ...s.link, color: "#595959" }}
                    onClick={() => setConfirmDestroy(false)}
                  >
                    cancel
                  </a>
                </span>
              </span>
            )}

            {pubKey && (
              <div style={{ marginTop: "0.5rem" }}>
                <span>Share a link with your public key:</span>
                <input
                  type="text"
                  readOnly
                  value={getKeyLink(pubKey as string)}
                  style={{
                    ...s.input,
                    ...s.inputDisabled,
                    marginTop: "0.3rem",
                    fontSize: 12,
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                {recieveMode && (
                  <div
                    style={{
                      ...s.infoAlert,
                      marginTop: "0.5rem",
                      marginBottom: 0,
                    }}
                  >
                    <strong>1.</strong> Copy the link above and send it to the
                    person who sent you here.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isPrefilledKey && (
          <div style={{ marginTop: "0.5rem", fontSize: 13 }}>
            Key set by URL.{" "}
            <a href="/" style={s.link}>
              Unset key
            </a>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      {privKey && (
        <div style={s.segmented}>
          {(["enc", "dec"] as const).map((m) => (
            <button
              key={m}
              style={{ ...s.segBtn, ...(mode === m ? s.segBtnActive : {}) }}
              onClick={() => {
                setCiphertext("");
                setPlaintext("");
                setMode(m);
              }}
            >
              {m === "enc" ? "Encrypt" : "Decrypt"}
            </button>
          ))}
        </div>
      )}

      {/* Encrypt / Decrypt */}
      {mode === "dec" && (
        <div style={s.card}>
          <h2 style={s.h2}>Decrypt stuff</h2>
          {recieveMode && (
            <div style={s.infoAlert}>
              <strong>2.</strong> Paste the text they sent (should start with{" "}
              <code style={s.code}>BEGIN AGE</code>) here. The decrypted message
              will appear below.
            </div>
          )}
          <label htmlFor="decrypt_stuff" style={s.label}>
            Ciphertext input
          </label>
          <textarea
            id="decrypt_stuff"
            value={ciphertext}
            spellCheck={false}
            autoComplete="off"
            rows={10}
            style={s.textarea}
            onChange={(e) =>
              setCiphertext((e.target as HTMLTextAreaElement).value)
            }
          />
          <label
            htmlFor="decrypted_output"
            style={{ ...s.label, marginTop: "0.75rem" }}
          >
            Decrypted output
          </label>
          <textarea
            id="decrypted_output"
            value={resultContent}
            readOnly
            rows={6}
            style={{ ...s.textarea, ...s.textareaReadonly }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {mode === "enc" && (
        <div style={s.card}>
          <h2 style={s.h2}>Encrypt stuff</h2>
          <label htmlFor="encrypt_stuff" style={s.label}>
            Plaintext input
          </label>
          <textarea
            id="encrypt_stuff"
            value={plaintext}
            rows={10}
            style={s.textarea}
            onChange={(e) =>
              setPlaintext((e.target as HTMLTextAreaElement).value)
            }
          />
          <label
            htmlFor="encrypted_output"
            style={{ ...s.label, marginTop: "0.75rem" }}
          >
            Encrypted output
          </label>
          <textarea
            id="encrypted_output"
            value={resultContent}
            readOnly
            rows={6}
            style={{ ...s.textarea, ...s.textareaReadonly }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {/* Useful options */}
      <div style={s.card}>
        <h2 style={s.h2}>Useful Options</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: 13 }}>
          The <code style={s.code}>?r=age1...</code> query parameter can be set
          to an age public key to pre-fill the public key field. It can be
          repeated to encrypt for multiple recipients.
        </p>
        <p style={{ margin: 0, fontSize: 13 }}>
          The{" "}
          <code style={s.code}>
            <a href="/?receive_mode=1" style={s.link}>
              ?receive_mode=1
            </a>
          </code>{" "}
          query parameter sets up this page to automatically generate a key and
          enter decrypt mode. (Using this option ignores the{" "}
          <code style={s.code}>?r=</code> parameter.)
        </p>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 12, color: "#595959", lineHeight: 1.8 }}>
        <a
          href="https://github.com/nkcmr/age-online"
          target="_blank"
          rel="noreferrer noopener"
          style={s.link}
        >
          github
        </a>
        <br />
        powered by{" "}
        <a
          href="https://pages.cloudflare.com/"
          target="_blank"
          rel="noreferrer noopener"
          style={s.link}
        >
          cloudflare pages
        </a>
      </div>
    </main>
  );
}

export default App;
