import React, {
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { typeageImplementation } from "./age";
import { ScreenSize, screenSizeToNumber, useScreenSize } from "./useScreenSize";

const {
  encrypt: ageEncrypt,
  decrypt: ageDecrypt,
  generateIdentity: ageGenerateX25519Identity,
} = typeageImplementation;

(globalThis as any).ageEncrypt = ageEncrypt;
(globalThis as any).ageDecrypt = ageDecrypt;
(globalThis as any).ageGenerateX25519Identity = ageGenerateX25519Identity;

const Heading: FunctionComponent<
  PropsWithChildren<{ size: "large" | "medium" | "small" }>
> = ({ size, children }) => {
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
    onClick={(e) => {
      const range = document.createRange();
      range.selectNode(e.target as Node);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }}
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

const evaluate = (v: boolean | (() => boolean)): boolean =>
  typeof v === "function" ? v() : v;

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
        <>
          <span className="text-red-500 cursor-default">
            {props.confirmText}
          </span>
          <span>&nbsp;—&nbsp;</span>
          <span
            className="text-blue-400 cursor-pointer"
            onClick={() => {
              setStep(Step.DEFAULT);
              props.onConfirm();
            }}
          >
            ok
          </span>
          <span className="text-gray-400">{" | "}</span>
          <span
            className="text-gray-600 cursor-pointer"
            onClick={() => {
              setStep(Step.DEFAULT);
            }}
          >
            cancel
          </span>
        </>
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

const InfoCard: React.FC<PropsWithChildren> = ({ children }) => (
  <div className="mb-4 p-2 border-blue-300 border rounded bg-blue-100 text-sm">
    {children}
  </div>
);

const InlineCode: React.FC<PropsWithChildren> = ({ children }) => (
  <code className="text-xs bg-gray-100 p-1 rounded-sm border border-gray-300">
    {children}
  </code>
);

const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    screenSize: ScreenSize;
    fontMono?: boolean;
  }
> = ({ screenSize, fontMono, cols, ...props }) => {
  const isSmallScreen =
    screenSizeToNumber(screenSize) <= screenSizeToNumber("sm");
  return (
    <textarea
      {...props}
      className={classNames({
        "border border-gray-400 rounded-sm text-sm p-2 mt-1": true,
        "font-mono": !!fontMono,
        "w-full": isSmallScreen,
      })}
      cols={isSmallScreen ? undefined : cols}
    ></textarea>
  );
};

function App() {
  const screenSize = useScreenSize();
  const [recieveMode] = useState(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.has("receive_mode");
  });
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const [pubKey, setPubKey] = useState<string[] | string>(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (recieveMode) {
      // ignore r parameter in receive_mode
      return "";
    }
    if (params.has("r")) {
      return params.getAll("r");
    }
    return "";
  });
  const [privKey, setPrivKey] = useState<string | null>(null);
  useEffect(() => {
    (globalThis as any).revealAgePrivateKey = () => {
      return privKey;
    };
    return () => {
      delete (globalThis as any).revealAgePrivateKey;
    };
  }, [privKey]);
  const [ageError, setAgeError] = useState("");
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

  const [pubKeys, setPubKeys] = useState<string[]>([]);
  useEffect(() => {
    if (pubKey) {
      if (Array.isArray(pubKey)) {
        setPubKeys(pubKey);
      } else {
        setPubKeys([pubKey]);
      }
    } else {
      setPubKeys([]);
    }
  }, [pubKey]);

  useEffect(() => {
    if (mode === "enc") {
      return;
    }
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
      .then((pt) => {
        setPlaintext(pt);
      })
      .catch((e) => {
        setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`);
      });
  }, [ciphertext, privKey, mode]);

  // encrypting effect
  useEffect(() => {
    if (mode === "dec") {
      return;
    }
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
      .then((ct) => {
        setCiphertext(ct);
      })
      .catch((e) => {
        setAgeError(`ERROR: ${`${e}`.replace(/^(\s*error\s*:\s*)+/gi, "")}`);
      });
  }, [plaintext, pubKeys, mode]);

  const isPrefilledKey = Array.isArray(pubKey);
  const [pubKeyValue, pubKeyDisabled] = ((): [string, boolean] => {
    if (isPrefilledKey) {
      if (pubKey.length > 1) {
        return ["<multiple>", true];
      }
      return [pubKey[0], true];
    }
    return [pubKey, !!privKey];
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
          (everything is in-browser, powered by{" "}
          <a
            target="_blank"
            rel="noopener noreferrer external"
            href="https://github.com/FiloSottile/typage/"
          >
            typage
          </a>
          , data does not go ANYWHERE)
        </ExtraSmall>
      </div>
      {recieveMode && (
        <InfoCard>
          👋 Hello, someone is trying to send you secure text. There are some
          instructions on how to receive that and decrypt it below.
        </InfoCard>
      )}
      <div id="age-key">
        <Heading size="small">
          <label htmlFor="public_key">public key:</label>
        </Heading>
        <div>
          <input
            type="text"
            id="public_key"
            className={classNames({
              "border border-gray-400 rounded-sm text-sm p-2": true,
              "bg-gray-200": pubKeyDisabled,
              "w-full":
                screenSizeToNumber(screenSize) <= screenSizeToNumber("sm"),
            })}
            style={((): React.CSSProperties => {
              var s: React.CSSProperties = {};
              if (screenSizeToNumber(screenSize) > screenSizeToNumber("sm")) {
                s.width = "510px";
              }
              return s;
            })()}
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
                          onClick={async () => {
                            try {
                              const [keyPriv, keyPub] =
                                await ageGenerateX25519Identity();
                              setPubKey(keyPub);
                              setPrivKey(keyPriv);
                            } catch (e) {
                              console.error({ e });
                            }
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
                      if (recieveMode) {
                        globalThis.location.href = "/";
                        return;
                      }
                      setPubKey("");
                      setPrivKey(null);
                      if (mode === "dec") {
                        setPlaintext("");
                      }
                      setMode("enc");
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
                      className={classNames({
                        "border border-gray-400 rounded-sm text-xs p-2": true,
                        "w-full":
                          screenSizeToNumber(screenSize) <=
                          screenSizeToNumber("sm"),
                      })}
                      value={getKeyLink(pubKey)}
                      readOnly={true}
                      style={((): React.CSSProperties => {
                        var s: React.CSSProperties = {};
                        if (
                          screenSizeToNumber(screenSize) >
                          screenSizeToNumber("sm")
                        ) {
                          s.width = "500px";
                        }
                        return s;
                      })()}
                      onClick={(e) => {
                        // console
                        (e.target as any).focus();
                        (e.target as any).select();
                      }}
                    />
                  </ExtraSmall>
                  <div className="mb-2"></div>
                  {recieveMode && (
                    <InfoCard>
                      <b>1.</b>&nbsp;Copy the above (☝️) link and send it to the
                      person that sent you here.
                    </InfoCard>
                  )}
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
            {recieveMode && (
              <InfoCard>
                <b>2.</b>&nbsp;Paste the text they sent (should start with{" "}
                <InlineCode>BEGIN AGE</InlineCode>) here. The decrypted message
                will be output below.
              </InfoCard>
            )}
            <Heading size="medium">
              <label htmlFor="decrypt_stuff">decrypt stuff</label>
            </Heading>
            <p>
              enter some text below to have it decrypted with the generated
              private key:
            </p>
            <Textarea
              id="decrypt_stuff"
              value={ciphertext}
              spellCheck="false"
              autoComplete="off"
              rows={15}
              cols={64}
              onChange={(e) => {
                setCiphertext(e.target.value);
              }}
              screenSize={screenSize}
              fontMono={true}
            ></Textarea>
            <p className="mt-3">
              below is the decrypted version of the input above:
            </p>
            <ResultDiplay>{ageError || plaintext}</ResultDiplay>
          </div>
        )}
        {mode === "enc" && (
          <div id="age-encrypter">
            <Heading size="medium">
              <label htmlFor="encrypt_stuff">encrypt stuff</label>
            </Heading>
            <p>
              enter some text below to have it encrypted with the above public
              key:
            </p>
            <Textarea
              id="encrypt_stuff"
              value={plaintext}
              rows={15}
              cols={50}
              onChange={(e) => {
                setPlaintext(e.target.value);
              }}
              screenSize={screenSize}
            ></Textarea>
            <p className="mt-3">
              below is the encrypted version of the input above:
            </p>
            <ResultDiplay>{ageError || ciphertext}</ResultDiplay>
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
          The{" "}
          <InlineCode>
            <a href="/?receive_mode=1">?receive_mode=1</a>
          </InlineCode>{" "}
          query parameter can be set and sent as a link to someone so they can
          have this page set up to automatically generate a key and put in
          decrypt mode, making it easy to send encrypted material to someone.
          (Using this option will cause the <InlineCode>?r=</InlineCode>{" "}
          parameter to be ignored.)
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
