import React, { useEffect, useState } from "react";
import "./App.css";
import { ageDecrypt, ageEncrypt, ageGenerateX25519Identity } from "./worker";

(global as any).ageEncrypt = ageEncrypt;
(global as any).ageDecrypt = ageDecrypt;
(global as any).ageGenerateX25519Identity = ageGenerateX25519Identity;

const Heading: React.FC<{ size: "large" | "medium" | "small" }> = ({
  size,
  children,
}) => {
  const universalClasses = "";
  switch (size) {
    case "large":
      return (
        <h1 className={`text-3xl mb-4 ${universalClasses}`}>{children}</h1>
      );
    case "medium":
      return <h2 className={`text-lg mb-3 ${universalClasses}`}>{children}</h2>;
    case "small":
      return <h3 className={`text-md mb-2 ${universalClasses}`}>{children}</h3>;
  }
  throw new Error(`invalid heading size: ${size}`);
};

const ResultDiplay: React.FC<React.HTMLAttributes<HTMLPreElement>> = (
  props
) => (
  <pre
    className="text-xs mt-3 p-3 bg-gray-200 rounded shadow-inner overflow-scroll"
    {...props}
  ></pre>
);

const ExtraSmall: React.FC<React.HTMLAttributes<HTMLElement>> = (props) => (
  <small className="text-xs" {...props}></small>
);

const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({
  children,
  href,
  className,
  ...rest
}) => {
  const style: React.CSSProperties = {};
  if (!href) {
    style.cursor = "pointer";
  }
  return (
    <a
      className={className || `text-blue-600 visited:text-purple-600`}
      href={href}
      style={style}
      rel="noreferrer nofollow noopener"
      {...rest}
    >
      {children}
    </a>
  );
};

function evaluate(v: boolean | (() => boolean)): boolean {
  if (typeof v === "function") {
    return v();
  }
  return v;
}

const classNames = (
  options: Record<string, (() => boolean) | boolean>
): string => {
  var result: string[] = [];
  for (let klass in options) {
    const v = options[klass];
    if (evaluate(v)) {
      result.push(klass);
    }
  }
  return result.join(" ");
};

const InlineRadioButtonGroup: React.FC<{
  onChange: (selection: string) => any;
  selected: string;
  options: Array<{
    id: string;
    label: string;
  }>;
}> = (props) => {
  if (props.options.length === 0) {
    return <></>;
  }
  return (
    <div className="flex">
      {props.options.map((o, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === props.options.length - 1;
        const isSelected = o.id === props.selected;
        return (
          <button
            key={idx}
            onClick={() => {
              props.onChange(o.id);
            }}
            className={classNames({
              rounded: isFirst && isLast,
              "rounded-l": isFirst && !isLast,
              "rounded-r": isLast && !isFirst,
              "bg-gray-500": !isSelected,
              "bg-gray-700": isSelected,
              "text-white": true,
              "py-2": true,
              "px-3": true,
            })}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

const ConfirmButton: React.FC<{
  defaultText: string;
  confirmText: string;
  onConfirm: () => any;
}> = (props) => {
  enum Step {
    DEFAULT = 0,
    LAST_CHANCE = 1,
  }
  const [step, setStep] = useState<Step>(Step.DEFAULT);
  switch (step) {
    case Step.DEFAULT:
      return (
        <Link
          onClick={() => {
            setStep(Step.LAST_CHANCE);
          }}
        >
          {props.defaultText}
        </Link>
      );
    case Step.LAST_CHANCE:
      return (
        <Link
          className="text-red-500"
          onClick={() => {
            setStep(Step.DEFAULT);
            props.onConfirm();
          }}
        >
          {props.confirmText}
        </Link>
      );
  }
  throw new Error("unreachable");
};

const getKeyLink = (key: string): string => {
  return `https://age-online.com/?r=${key}`;
};

type KeyPair = {
  public: string;
  private: string;
};

const InfoCard: React.FC<{}> = ({ children }) => (
  <div className="mb-4 p-2 border-blue-300 border rounded bg-blue-100 text-sm">
    {children}
  </div>
);

const InlineCode: React.FC<{}> = ({ children }) => (
  <code className="text-xs bg-gray-100 p-1 rounded-sm border border-gray-300">
    {children}
  </code>
);

function App() {
  const [recieveMode] = useState(() => {
    const params = new URLSearchParams(global.location.search);
    return params.has("receive_mode");
  });
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const [pubKey, setPubKey] = useState<string[] | string>(() => {
    const params = new URLSearchParams(global.location.search);
    if (params.has("r")) {
      return params.getAll("r");
    }
    return "";
  });
  const [privKey, setPrivKey] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");

  useEffect(() => {
    // receive mode will:
    // - auto-generate a keypair
    // - set to "dec" mode
    // - cause a few helpful messages to show up
    if (!recieveMode) {
      return;
    }
    ageGenerateX25519Identity().then((pair) => {
      var newkp: KeyPair = {
        public: pair[1],
        private: pair[0],
      };
      setPubKey(newkp.public);
      setPrivKey(newkp.private);
      setMode("dec");
    });
  }, [recieveMode]);

  useEffect(() => {
    if (mode === "dec" && ciphertext.charAt(0) === "<") {
      setCiphertext("");
    }
    if (mode === "enc" && plaintext.charAt(0) === "<") {
      setPlaintext("");
    }
  }, [mode]);

  const pubKeys = (() => {
    if (pubKey) {
      if (Array.isArray(pubKey)) {
        return pubKey;
      }
      return [pubKey];
    }
    return [];
  })();

  useEffect(() => {
    if (mode === "enc") {
      return;
    }
    if (!privKey) {
      setMode("enc");
      return;
    }
    if (ciphertext === "") {
      setPlaintext("<nothing to decrypt>");
      return;
    }
    ageDecrypt(ciphertext, privKey)
      .then((pt) => {
        setPlaintext(pt);
      })
      .catch((e) => {
        setPlaintext(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`);
      });
  }, [ciphertext, privKey, mode]);

  // encrypting effect
  useEffect(() => {
    if (mode === "dec") {
      return;
    }
    if (plaintext === "") {
      setCiphertext("<nothing to encrypt>");
      return;
    }
    if (pubKeys.length === 0) {
      setCiphertext("<no public key entered>");
      return;
    }
    ageEncrypt(plaintext, pubKeys)
      .then((ct) => {
        setCiphertext(ct);
      })
      .catch((e) => {
        setCiphertext(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`);
      });
  }, [plaintext, pubKey, mode]);

  const isPrefilledKey = Array.isArray(pubKey);
  const [pubKeyValue, pubKeyDisabled] = ((): [string, boolean] => {
    if (isPrefilledKey) {
      if (pubKey.length > 1) {
        return ["<multiple>", true];
      }
      return [pubKey[0], true];
    }
    return [pubKey, false];
  })();
  return (
    <div className="p-8 max-w-screen-sm">
      <div id="header" className="pb-8">
        <Heading size="large">
          <Link href="https://age-encryption.org" target="_blank">
            age
          </Link>{" "}
          online encrypter
        </Heading>
        <p>easily pass around secure data with age</p>
        <ExtraSmall>
          (everything is in-browser, powered by WASM, data does not go ANYWHERE)
        </ExtraSmall>
      </div>
      {recieveMode && (
        <InfoCard>
          👋 Hello, someone is trying to send you secure text. There are some
          instructions on how to receive that and decrypt it below.
        </InfoCard>
      )}
      <div id="age-key">
        <Heading size="small">public key:</Heading>
        <div>
          <input
            type="text"
            className="border border-gray-400 rounded-sm text-sm p-2"
            style={{ width: "510px" }}
            spellCheck={false}
            autoComplete="off"
            disabled={pubKeyDisabled}
            value={pubKeyValue}
            onChange={(e) => {
              setPubKey(e.target.value);
            }}
          />
        </div>
        <div>
          <br />
          {!isPrefilledKey && (
            <>
              {pubKeys.length === 0 && (
                <div>
                  <div>
                    <small>
                      input a public key (should start with <b>age1</b>).
                    </small>
                  </div>
                  <div>
                    <b>OR</b>
                  </div>
                  <div>
                    {!privKey && (
                      <small>
                        <Link
                          onClick={() => {
                            ageGenerateX25519Identity().then((pair) => {
                              var newkp: KeyPair = {
                                public: pair[1],
                                private: pair[0],
                              };
                              setPubKey(newkp.public);
                              setPrivKey(newkp.private);
                            });
                          }}
                        >
                          generate public/private key pair
                        </Link>
                      </small>
                    )}
                  </div>
                </div>
              )}
              {!!privKey && (
                <small>
                  <ConfirmButton
                    defaultText="destroy key"
                    confirmText="are you sure you want to destroy the keypair? any encrypted data will be lost!"
                    onConfirm={() => {
                      setPubKey("");
                      setPrivKey(null);
                    }}
                  />
                </small>
              )}
              {pubKey && (
                <>
                  <br />
                  <ExtraSmall>
                    send a link with your public key:
                    <br />
                    <input
                      className="border border-gray-400 rounded-sm text-xs p-2"
                      value={getKeyLink(pubKey)}
                      readOnly={true}
                      onClick={(e) => {
                        // console
                        (e.target as any).focus();
                        (e.target as any).select();
                      }}
                      style={{ width: "500px" }}
                    />
                  </ExtraSmall>
                  <div className="mb-2"></div>
                  <InfoCard>
                    <b>1.</b>&nbsp;Copy the above (☝️) link and send it to the
                    person that sent you here.
                  </InfoCard>
                </>
              )}
            </>
          )}
          {isPrefilledKey && (
            <ExtraSmall>
              key set by url. <Link href="/">unset key</Link>
            </ExtraSmall>
          )}
        </div>
      </div>
      <hr className="my-8" />
      {privKey && (
        <InlineRadioButtonGroup
          onChange={(selection) => {
            setCiphertext("");
            setPlaintext("");
            setMode(selection as any);
          }}
          selected={mode}
          options={[
            { id: "enc", label: "encrypt" },
            { id: "dec", label: "decrypt" },
          ]}
        />
      )}
      <div className="mt-4">
        {mode === "dec" && (
          <div id="age-decrypter">
            <InfoCard>
              <b>2.</b>&nbsp;Paste the text they sent (should start with{" "}
              <InlineCode>BEGIN AGE</InlineCode>) here. The decrypted message
              will be output below.
            </InfoCard>
            <Heading size="medium">decrypt stuff</Heading>
            <p>
              enter some text below to have it decrypted with the generated
              private key:
            </p>
            <textarea
              className="border border-gray-400 rounded-sm text-sm p-2 mt-1 font-mono	"
              value={ciphertext}
              spellCheck="false"
              autoComplete="off"
              rows={15}
              cols={64}
              onChange={(e) => {
                setCiphertext(e.target.value);
              }}
            ></textarea>
            <p className="mt-3">
              below is the decrypted version of the input above:
            </p>
            <ResultDiplay>{plaintext}</ResultDiplay>
          </div>
        )}
        {mode === "enc" && (
          <div id="age-encrypter">
            <Heading size="medium">encrypt stuff</Heading>
            <p>
              enter some text below to have it encrypted with the above public
              key:
            </p>
            <textarea
              className="border border-gray-400 rounded-sm text-sm p-2 mt-1"
              value={plaintext}
              rows={15}
              cols={50}
              onChange={(e) => {
                setPlaintext(e.target.value);
              }}
            ></textarea>
            <p className="mt-3">
              below is the encrypted version of the input above:
            </p>
            <ResultDiplay>{ciphertext}</ResultDiplay>
          </div>
        )}
      </div>
      <hr className="my-8" />
      <div id="useful-options">
        <Heading size="medium">useful options</Heading>
        <p className="text-sm mb-3">
          The <InlineCode>?r=age1...</InlineCode> query parameter can be set to
          an age public key to make a link that will pre-fill the public key
          text box make it easy to receive encrypted material. The parameter can
          also be repeated to encrypt for multiple recipients.
        </p>
        <p className="text-sm">
          The <InlineCode>?receive_mode=1</InlineCode> query parameter can be
          set and sent as a link to someone so they can have this page set up to
          automatically generate a key and put in decrypt mode, making it easy
          to send encrypted material to someone.
        </p>
        <ExtraSmall></ExtraSmall>
      </div>
      <hr className="my-8" />
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
