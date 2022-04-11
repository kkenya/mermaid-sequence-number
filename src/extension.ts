import { fromMarkdown } from "mdast-util-from-markdown";
import * as vscode from "vscode";

const mdastType = {
  codeBlock: "code",
} as const;
const language = {
  mermaid: "mermaid",
} as const;
const diagramType = {
  sequence: "sequenceDiagram",
} as const;
const identifier = {
  autonumber: "autonumber",
  comment: "%%",
  participant: "participant",
  actor: "actor",
} as const;

const decorationType = vscode.window.createTextEditorDecorationType({
  before: {
    textDecoration: `;
      font-size: 0.8em;
      border-radius: 1em;
      padding: 0 0.2em;',
    `,
    margin: "0 0.5em;",
  },
  dark: {
    before: {
      color: "#000",
      backgroundColor: "#FFF",
    },
  },
  light: {
    before: {
      color: "#FFF",
      backgroundColor: "#000",
    },
  },
});

const getStatementPosition = (charactors: string) => {
  const trimed = charactors.trimLeft();
  if (
    trimed.length === 0 ||
    trimed.startsWith(identifier.comment) ||
    trimed.startsWith(identifier.participant) ||
    trimed.startsWith(identifier.actor)
  ) {
    return;
  }

  if (/(->|-->|-->>|-x|--x|-\)|--\))/.test(trimed)) {
    const start = charactors.match(/[^\s]/);
    const end = charactors.match(/\s*$/);
    if (typeof start?.index === "number" && typeof end?.index === "number") {
      return { start: start.index, end: end.index };
    }
  }
};

const decorate = (openEditor: vscode.TextEditor) => {
  const tree = fromMarkdown(openEditor.document.getText());

  tree.children.forEach((content) => {
    if (
      content.type === mdastType.codeBlock &&
      content.lang === language.mermaid
    ) {
      const codeBlockLines = content.value.split("\n");

      const trimedLefts = codeBlockLines.map((codeBlockLine) =>
        codeBlockLine.trimLeft()
      );
      const isSequenceDiagram = trimedLefts.some((trimedLine) =>
        trimedLine.startsWith(diagramType.sequence)
      );
      if (!isSequenceDiagram) {
        openEditor.setDecorations(decorationType, []);
        return;
      }
      const isEnabled = trimedLefts.some((trimedLine) =>
        trimedLine.startsWith(identifier.autonumber)
      );
      if (!isEnabled) {
        openEditor.setDecorations(decorationType, []);
        return;
      }

      const decorationOptions: vscode.DecorationOptions[] = [];
      codeBlockLines.forEach((lineChars, codeBlockInnerLine) => {
        if (content.position === undefined) {
          console.log("unexpected content");
          return;
        }
        const position = getStatementPosition(lineChars);
        if (position) {
          const line = content.position.start.line + codeBlockInnerLine;
          const range = new vscode.Range(
            new vscode.Position(line, position.start),
            new vscode.Position(line, position.end)
          );
          const numberOfSequence = decorationOptions.length + 1;

          decorationOptions.push({
            range,
            renderOptions: {
              before: {
                contentText: String(numberOfSequence),
              },
            },
          });
        }
      });
      openEditor.setDecorations(decorationType, decorationOptions);
    }
  });
};

export function activate(context: vscode.ExtensionContext) {
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (editor.document.languageId !== language.mermaid) {
      return null;
    }
    decorate(editor);
  });

  const disposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId !== language.mermaid) {
        return null;
      }

      const [openEditor] = vscode.window.visibleTextEditors.filter(
        (editor) => editor.document.uri === event.document.uri
      );
      decorate(openEditor);
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
