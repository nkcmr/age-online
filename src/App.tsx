import React, { useEffect, useState } from "react";
import "./App.css";
import { ageEncrypt, ageGenerateX25519Identity } from "./worker";

(global as any).ageEncrypt = ageEncrypt;
(global as any).ageGenerateX25519Identity = ageGenerateX25519Identity;

const ExtraSmall: React.FC<React.HTMLAttributes<HTMLElement>> = (props) => (
  <small style={{ fontSize: "0.6em" }} {...props}></small>
);

const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({
  children,
  href,
  ...rest
}) => {
  return (
    <a href={href} rel="noreferrer nofollow noopener" {...rest}>
      {children}
    </a>
  );
};

const getKeyLink = (key: string): string => {
  return `https://age-online.com/?r=${key}`;
};

function App() {
  const [gsOpen, setGsOpen] = useState(!!sessionStorage.getItem("gs_open"));
  const [pubKey, setPubKey] = useState<string[] | string>(() => {
    const params = new URLSearchParams(global.location.search);
    if (params.has("r")) {
      return params.getAll("r");
    }
    return "";
  });
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  // useEffect(() => {
  //   ageGenerateX25519Identity().then(([, newPubKey]) => {
  //     setPubKey(newPubKey);
  //   });
  // }, []);
  useEffect(() => {
    if (plaintext === "") {
      setCiphertext("<nothing to encrypt>");
      return;
    }
    if (!pubKey) {
      setCiphertext("<no public key entered>");
      return;
    }
    ageEncrypt(plaintext, Array.isArray(pubKey) ? pubKey : [pubKey])
      .then((ct) => {
        setCiphertext(ct);
      })
      .catch((e) => {
        // lol, trim the repeated "error: " prefix
        var errmsg = `${e}`;
        var cb = 0;
        while (/^\s*error\s*:\s*/i.test(errmsg)) {
          cb++;
          // circuit breaker
          if (cb > 100) {
            break;
          }
          errmsg = errmsg.replace(/^\s*error\s*:\s*/i, "");
        }
        setCiphertext(`ERROR: ${errmsg}`);
      });
  }, [plaintext, pubKey]);
  const isPrefilledKey = Array.isArray(pubKey);
  return (
    <div style={{ padding: "2rem" }}>
      <div id="header">
        <h2>
          <Link href="https://age-encryption.org" target="_blank">
            age
          </Link>{" "}
          online encrypter
        </h2>
        <p>easily pass around secure data with age</p>
        <ExtraSmall>
          (everything is in-browser, powered by WASM, data does not go ANYWHERE)
        </ExtraSmall>
        <small style={{ fontSize: "0.6rem" }}></small>
      </div>
      <div id="getting-started" style={{ maxWidth: "400px" }}>
        <h4>
          <a
            title="open for tips"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (gsOpen) {
                sessionStorage.removeItem("gs_open");
                setGsOpen(false);
              } else {
                sessionStorage.setItem("gs_open", "1");
                setGsOpen(true);
              }
            }}
          >
            {gsOpen ? <>&#9660;</> : <>&#9654;</>}
          </a>{" "}
          getting started
        </h4>
        {gsOpen && (
          <>
            <ol>
              <li>
                <b>install age:</b>{" "}
                <Link
                  target="_blank"
                  href="https://github.com/FiloSottile/age#installation"
                >
                  go here
                </Link>{" "}
                to get age on your computer
              </li>
              <li>
                <b>generate a private key:</b>
                <pre>
                  $ age-keygen -o key.txt
                  <br />
                  Public key:
                  age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
                </pre>
                <p>
                  this will write your <i>private</i> key which you will need to
                  decrypt what this page generates.
                </p>
              </li>
              <li>
                <b>copy the public key here:</b> the previous command printed
                out the public key (begins with "age1"). copy-paste that into
                the "public key" text box below.
              </li>
            </ol>
          </>
        )}
      </div>
      <div id="age-key">
        <h4>enter a public key:</h4>
        <input
          type="text"
          disabled={isPrefilledKey}
          style={{ padding: "1em", width: "500px" }}
          value={
            isPrefilledKey
              ? pubKey.length === 1
                ? pubKey[0]
                : "<multiple>"
              : pubKey
          }
          onChange={(e) => {
            setPubKey(e.target.value);
          }}
        />
        <div>
          <br />
          {!isPrefilledKey && (
            <>
              <small>
                input a public key (should start with <b>age1</b>)
              </small>
              {pubKey && (
                <>
                  <br />
                  <ExtraSmall>
                    send a link with your key:{" "}
                    <Link href={getKeyLink(pubKey)}>{getKeyLink(pubKey)}</Link>
                  </ExtraSmall>
                </>
              )}
            </>
          )}
          {isPrefilledKey && (
            <ExtraSmall>
              key set by url. <a href="/">unset key</a>
            </ExtraSmall>
          )}
        </div>
      </div>
      <div id="age-encryptor">
        <h4>encrypt stuff</h4>
        <p>
          enter some text below to have it encrypted with the above public
          <br />
          key:
        </p>
        <textarea
          value={plaintext}
          rows={15}
          cols={50}
          onChange={(e) => {
            setPlaintext(e.target.value);
          }}
        ></textarea>
        <p>below is the encrypted version of the input above:</p>
        <pre>{ciphertext}</pre>
      </div>
      <div id="links">
        <ExtraSmall>
          <Link href="https://github.com/nkcmr/age-online" target="_blank">
            github
          </Link>
          <br />
        </ExtraSmall>
        <ExtraSmall>
          powered by{" "}
          <Link href="https://pages.cloudflare.com/" target="_blank">
            cloudflare pages
          </Link>
        </ExtraSmall>
      </div>
    </div>
  );
}

export default App;
