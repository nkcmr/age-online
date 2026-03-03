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

type Theme = "light" | "dark";

const themes: Record<Theme, Record<string, React.CSSProperties>> = {
  light: {
    page:           { background: "#fff", color: "#222" },
    muted:          { color: "#595959" },
    card:           { background: "#fff", border: "1px solid #e0e0e0" },
    input:          { background: "#fff", color: "#222", border: "1px solid #ccc" },
    inputDisabled:  { background: "#f5f5f5", color: "#595959" },
    textarea:       { background: "#fff", color: "#222", border: "1px solid #ccc" },
    textareaRo:     { background: "#f5f5f5" },
    infoAlert:      { background: "#e6f4ff", border: "1px solid #91caff", color: "#222" },
    code:           { background: "#f5f5f5", border: "1px solid #ddd", color: "#222" },
    link:           { color: "#0050b3" },
    linkDanger:     { color: "#a8071a" },
    linkCancel:     { color: "#595959" },
    segmented:      { background: "#f0f0f0", border: "1px solid #d9d9d9" },
    segBtn:         { color: "#222" },
    segBtnActive:   { background: "#0050b3", color: "#fff" },
    footer:         { color: "#595959" },
    toggleBtn:      { background: "#f0f0f0", border: "1px solid #d9d9d9", color: "#222" },
  },
  dark: {
    page:           { background: "#0d1117", color: "#e6edf3" },
    muted:          { color: "#8b949e" },
    card:           { background: "#161b22", border: "1px solid #30363d" },
    input:          { background: "#0d1117", color: "#e6edf3", border: "1px solid #30363d" },
    inputDisabled:  { background: "#161b22", color: "#8b949e" },
    textarea:       { background: "#0d1117", color: "#e6edf3", border: "1px solid #30363d" },
    textareaRo:     { background: "#161b22" },
    infoAlert:      { background: "#121d2f", border: "1px solid #1f6feb", color: "#e6edf3" },
    code:           { background: "#161b22", border: "1px solid #30363d", color: "#e6edf3" },
    link:           { color: "#58a6ff" },
    linkDanger:     { color: "#ff7b72" },
    linkCancel:     { color: "#8b949e" },
    segmented:      { background: "#161b22", border: "1px solid #30363d" },
    segBtn:         { color: "#e6edf3" },
    segBtnActive:   { background: "#1f6feb", color: "#fff" },
    footer:         { color: "#8b949e" },
    toggleBtn:      { background: "#161b22", border: "1px solid #30363d", color: "#e6edf3" },
  },
};

// Static styles that don't change with theme
const s: Record<string, React.CSSProperties> = {
  page:       { maxWidth: 620, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", fontSize: 14 },
  h1:         { fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem" },
  h2:         { fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem" },
  muted:      { fontSize: 12 },
  card:       { borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem" },
  input:      { display: "block", width: "100%", boxSizing: "border-box", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: 14, fontFamily: "monospace" },
  textarea:   { display: "block", width: "100%", boxSizing: "border-box", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: 13, fontFamily: "monospace", resize: "vertical" },
  infoAlert:  { borderRadius: 6, padding: "0.6rem 0.75rem", marginBottom: "0.75rem", fontSize: 13 },
  label:      { display: "block", fontWeight: 500, marginBottom: "0.3rem" },
  link:       { cursor: "pointer", textDecoration: "none" },
  linkDanger: { cursor: "pointer" },
  code:       { fontFamily: "monospace", borderRadius: 3, padding: "0 4px", fontSize: 12 },
  segmented:  { display: "inline-flex", borderRadius: 6, overflow: "hidden", marginBottom: "1rem" },
  segBtn:     { padding: "0.35rem 1rem", background: "none", border: "none", cursor: "pointer", fontSize: 14 },
  toggleBtn:  { padding: "0.3rem 0.7rem", borderRadius: 6, cursor: "pointer", fontSize: 13, lineHeight: 1 },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
};

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return [theme, toggle];
}

function App() {
  const [theme, toggleTheme] = useTheme();
  const t = themes[theme];

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
    return () => { delete (globalThis as any).revealAgePrivateKey; };
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
    if (!privKey) { setMode("enc"); return; }
    if (ciphertext === "") { setAgeError("<nothing to decrypt>"); return; }
    ageDecrypt({ ciphertext, privateKey: privKey })
      .then(setPlaintext)
      .catch((e) => setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`));
  }, [ciphertext, privKey, mode]);

  useEffect(() => {
    if (mode === "dec") return;
    setAgeError("");
    if (plaintext === "") { setAgeError("<nothing to encrypt>"); return; }
    if (pubKeys.length === 0) { setAgeError("<no public key entered>"); return; }
    ageEncrypt({ plaintext, recipients: pubKeys })
      .then(setCiphertext)
      .catch((e) => setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`));
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
    if (recieveMode) { globalThis.location.href = "/"; return; }
    setPubKey("");
    setPrivKey(null);
    if (mode === "dec") setPlaintext("");
    setMode("enc");
    setConfirmDestroy(false);
  }

  return (
    <main style={{ ...s.page, ...t.page }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={s.h1}>
          <a href="https://age-encryption.org" target="_blank" rel="noreferrer noopener" style={{ ...s.link, ...t.link }}>age</a>{" "}
          online encrypter
        </h1>
        <p style={{ margin: "0.25rem 0" }}>easily pass around secure data with age</p>
        <span style={{ ...s.muted, ...t.muted }}>
          (everything is in-browser, powered by{" "}
          <a target="_blank" rel="noopener noreferrer external" href="https://github.com/FiloSottile/typage/" style={{ ...s.link, ...t.link }}>typage</a>
          , data does not go ANYWHERE)
        </span>
      </div>

      {recieveMode && (
        <div style={{ ...s.infoAlert, ...t.infoAlert }}>
          Hello! Someone is trying to send you secure text. There are instructions below on how to receive and decrypt it.
        </div>
      )}

      {/* Public key */}
      <div style={{ ...s.card, ...t.card }}>
        <h2 style={s.h2}>Public Key</h2>
        <label htmlFor="public_key" style={s.label}>Public key</label>
        <input
          id="public_key"
          type="text"
          spellCheck={false}
          autoComplete="off"
          disabled={pubKeyDisabled}
          value={pubKeyValue}
          placeholder="age1..."
          onChange={(e) => setPubKey((e.target as HTMLInputElement).value)}
          style={{ ...s.input, ...t.input, ...(pubKeyDisabled ? t.inputDisabled : {}) }}
        />

        {!isPrefilledKey && (
          <div style={{ marginTop: "0.5rem", fontSize: 13 }}>
            {pubKeys.length === 0 && (
              <span>
                Input a public key (should start with <code style={{ ...s.code, ...t.code }}>age1</code>).{" "}
                {!privKey && (
                  <>Or <a style={{ ...s.link, ...t.link }} onClick={async () => {
                    try {
                      const [keyPriv, keyPub] = await ageGenerateX25519Identity();
                      setPubKey(keyPub);
                      setPrivKey(keyPriv);
                    } catch (e) { console.error(e); }
                  }}>generate a public/private key pair</a>.</>
                )}
              </span>
            )}

            {!!privKey && !confirmDestroy && (
              <a style={{ ...s.linkDanger, ...t.linkDanger }} onClick={() => setConfirmDestroy(true)}>destroy key</a>
            )}
            {!!privKey && confirmDestroy && (
              <span style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
                <span style={t.linkDanger}>Are you sure? Any encrypted data will be lost.</span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {"— "}
                  <a style={{ ...s.link, ...t.link }} onClick={destroyKey}>yes</a>
                  {" | "}
                  <a style={{ ...s.link, ...t.linkCancel }} onClick={() => setConfirmDestroy(false)}>cancel</a>
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
                  style={{ ...s.input, ...t.input, ...t.inputDisabled, marginTop: "0.3rem", fontSize: 12 }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                {recieveMode && (
                  <div style={{ ...s.infoAlert, ...t.infoAlert, marginTop: "0.5rem", marginBottom: 0 }}>
                    <strong>1.</strong> Copy the link above and send it to the person who sent you here.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isPrefilledKey && (
          <div style={{ marginTop: "0.5rem", fontSize: 13 }}>
            Key set by URL. <a href="/" style={{ ...s.link, ...t.link }}>Unset key</a>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      {privKey && (
        <div style={{ ...s.segmented, ...t.segmented }}>
          {(["enc", "dec"] as const).map((m) => (
            <button
              key={m}
              style={{ ...s.segBtn, ...t.segBtn, ...(mode === m ? t.segBtnActive : {}) }}
              onClick={() => { setCiphertext(""); setPlaintext(""); setMode(m); }}
            >
              {m === "enc" ? "Encrypt" : "Decrypt"}
            </button>
          ))}
        </div>
      )}

      {/* Decrypt */}
      {mode === "dec" && (
        <div style={{ ...s.card, ...t.card }}>
          <h2 style={s.h2}>Decrypt stuff</h2>
          {recieveMode && (
            <div style={{ ...s.infoAlert, ...t.infoAlert }}>
              <strong>2.</strong> Paste the text they sent (should start with <code style={{ ...s.code, ...t.code }}>BEGIN AGE</code>) here. The decrypted message will appear below.
            </div>
          )}
          <label htmlFor="decrypt_stuff" style={s.label}>Ciphertext input</label>
          <textarea
            id="decrypt_stuff"
            value={ciphertext}
            spellCheck={false}
            autoComplete="off"
            rows={10}
            style={{ ...s.textarea, ...t.textarea }}
            onChange={(e) => setCiphertext((e.target as HTMLTextAreaElement).value)}
          />
          <label htmlFor="decrypted_output" style={{ ...s.label, marginTop: "0.75rem" }}>Decrypted output</label>
          <textarea
            id="decrypted_output"
            value={resultContent}
            readOnly
            rows={6}
            style={{ ...s.textarea, ...t.textarea, ...t.textareaRo, cursor: "text" }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {/* Encrypt */}
      {mode === "enc" && (
        <div style={{ ...s.card, ...t.card }}>
          <h2 style={s.h2}>Encrypt stuff</h2>
          <label htmlFor="encrypt_stuff" style={s.label}>Plaintext input</label>
          <textarea
            id="encrypt_stuff"
            value={plaintext}
            rows={10}
            style={{ ...s.textarea, ...t.textarea }}
            onChange={(e) => setPlaintext((e.target as HTMLTextAreaElement).value)}
          />
          <label htmlFor="encrypted_output" style={{ ...s.label, marginTop: "0.75rem" }}>Encrypted output</label>
          <textarea
            id="encrypted_output"
            value={resultContent}
            readOnly
            rows={6}
            style={{ ...s.textarea, ...t.textarea, ...t.textareaRo, cursor: "text" }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      {/* Useful options */}
      <div style={{ ...s.card, ...t.card }}>
        <h2 style={s.h2}>Useful Options</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: 13 }}>
          The <code style={{ ...s.code, ...t.code }}>?r=age1...</code> query parameter can be set to an age public key to pre-fill the public key field. It can be repeated to encrypt for multiple recipients.
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: 13 }}>
          The <code style={{ ...s.code, ...t.code }}><a href="/?receive_mode=1" style={{ ...s.link, ...t.link }}>?receive_mode=1</a></code> query parameter sets up this page to automatically generate a key and enter decrypt mode. (Using this option ignores the <code style={{ ...s.code, ...t.code }}>?r=</code> parameter.)
        </p>
        <div style={{ borderTop: `1px solid ${theme === "light" ? "#e0e0e0" : "#30363d"}`, paddingTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: 13 }}>Color theme:</span>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            style={{ ...s.toggleBtn, ...t.toggleBtn }}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 12, lineHeight: 1.8, ...t.footer }}>
        <a href="https://github.com/nkcmr/age-online" target="_blank" rel="noreferrer noopener" style={{ ...s.link, ...t.link }}>github</a><br />
        powered by <a href="https://pages.cloudflare.com/" target="_blank" rel="noreferrer noopener" style={{ ...s.link, ...t.link }}>cloudflare pages</a>
      </div>
    </main>
  );
}

export default App;
