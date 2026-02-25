"use client";

import { useEffect, useRef, useState } from "react";
import type * as MonacoType from "monaco-editor";

interface MonacoJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

type MonacoEditor = MonacoType.editor.IStandaloneCodeEditor;
type MonacoModule = typeof MonacoType;

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

async function loadMonaco(): Promise<MonacoModule> {
  await import("monaco-editor/esm/vs/language/json/monaco.contribution");
  return import("monaco-editor/esm/vs/editor/editor.api");
}

function configureJsonDiagnostics(monaco: MonacoModule) {
  const jsonDefaults = (
    monaco.languages as unknown as {
      json?: {
        jsonDefaults?: {
          setDiagnosticsOptions: (options: {
            validate: boolean;
            allowComments: boolean;
            trailingCommas: "error" | "ignore" | "warning";
          }) => void;
        };
      };
    }
  ).json?.jsonDefaults;

  jsonDefaults?.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    trailingCommas: "error",
  });
}

function configureMonacoWorkers() {
  if (typeof window === "undefined" || window.MonacoEnvironment) {
    return;
  }

  window.MonacoEnvironment = {
    getWorker: (_moduleId, label) => {
      if (label === "json") {
        return new Worker(new URL("monaco-editor/esm/vs/language/json/json.worker", import.meta.url), {
          type: "module",
        });
      }

      return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url), {
        type: "module",
      });
    },
  };
}

export function MonacoJsonEditor({ value, onChange }: MonacoJsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const modelRef = useRef<MonacoType.editor.ITextModel | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const internalUpdateRef = useRef(false);
  const [hasMonacoError, setHasMonacoError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let changeDisposable: MonacoType.IDisposable | undefined;

    const init = async () => {
      if (typeof window === "undefined" || !containerRef.current) {
        return;
      }

      if (typeof window.Worker === "undefined") {
        setHasMonacoError(true);
        return;
      }

      try {
        configureMonacoWorkers();
        const monaco = await loadMonaco();
        if (disposed || !containerRef.current) {
          return;
        }

        configureJsonDiagnostics(monaco);

        const model = monaco.editor.createModel(initialValueRef.current, "json");
        modelRef.current = model;

        const editor = monaco.editor.create(containerRef.current, {
          model,
          language: "json",
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: true,
          wordWrap: "on",
          tabSize: 2,
          padding: {
            top: 10,
            bottom: 10,
          },
        });

        changeDisposable = editor.onDidChangeModelContent(() => {
          if (internalUpdateRef.current) {
            return;
          }
          onChangeRef.current(editor.getValue());
        });

        editorRef.current = editor;
        monaco.editor.setTheme("vs-dark");
        setIsReady(true);
      } catch (error) {
        console.error("Monaco failed to initialize.", error);
        setHasMonacoError(true);
      }
    };

    void init();

    return () => {
      disposed = true;
      changeDisposable?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
      modelRef.current?.dispose();
      modelRef.current = null;
      setIsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const currentValue = editorRef.current.getValue();
    if (currentValue === value) {
      return;
    }

    internalUpdateRef.current = true;
    editorRef.current.setValue(value);
    internalUpdateRef.current = false;
  }, [value]);

  if (hasMonacoError) {
    return (
      <textarea
        className="lab-textarea lab-textarea-code"
        rows={24}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div className="lab-monaco-shell">
      {!isReady ? <p className="lab-monaco-loading">Loading editor...</p> : null}
      <div ref={containerRef} className="lab-monaco-editor" />
    </div>
  );
}
