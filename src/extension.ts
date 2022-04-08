import { resolveCliArgsFromVSCodeExecutablePath } from "@vscode/test-electron";
import { fromMarkdown } from "mdast-util-from-markdown";
// import { inspect } from "unist-util-inspect";
import * as vscode from "vscode";

const MDADT_TYPE = {
  codeBlock: "code",
} as const;
const language = {
  mermaid: "mermaid",
} as const;
const mermaid_type = {
  sequenceDiagram: "sequenceDiagram",
} as const;
const mermaid_identifier = {
  comment: "%%",
  participant: "participant",
  actor: "actor",
} as const;

const decorationType = vscode.window.createTextEditorDecorationType({
  before: {
    color: "#000",
    backgroundColor: "#FFF",
    textDecoration: `;
      font-size: 0.8em;
      border-radius: 1em;
      padding: 0 0.2em;',
    `,
    margin: "0 0.5em;",
    // width: '1em;',
    // height: '1em;'
  },
});

const getRange = (
  lineChars: string,
  codeBlockStartLine: number,
  codeBlockInnerLine: number
) => {
  const trimed = lineChars.trimLeft();
  if (trimed.length === 0) {
    return;
  }
  if (trimed.startsWith(mermaid_identifier.comment)) {
    return;
  }
  if (trimed.startsWith(mermaid_type.sequenceDiagram)) {
    return;
  }
  if (
    trimed.startsWith(mermaid_identifier.participant) ||
    trimed.startsWith(mermaid_identifier.actor)
  ) {
    return;
  }
  if (/(->|-->|-->>|-x|--x|-\)|--\))/.test(trimed)) {
    const startResult = lineChars.match(/[^\s]/);
    const endResult = lineChars.match(/\s*$/);
    // console.log("start", startResult, "end", endResult);
    if (
      typeof startResult?.index === "number" &&
      typeof endResult?.index === "number"
    ) {
      // console.debug(`"ln: ${codeBlockInnerLine}, spaces: ${startResult.index}`);
      const range = new vscode.Range(
        new vscode.Position(
          codeBlockStartLine + codeBlockInnerLine,
          startResult.index
        ),
        new vscode.Position(
          codeBlockStartLine + codeBlockInnerLine,
          endResult.index
        )
      );
      return range;
    }
  }
};

const decorate = (openEditor: vscode.TextEditor) => {
  const tree = fromMarkdown(openEditor.document.getText());

  tree.children.forEach((content) => {
    if (
      content.type === MDADT_TYPE.codeBlock &&
      content.lang === language.mermaid
    ) {
      const codeBlockLines = content.value.split("\n");

      const trimedLefts = codeBlockLines
        .map((codeBlockLine) => codeBlockLine.trimLeft());
      const isSequenceDiagram = trimedLefts
        .some((trimedLine) => trimedLine.startsWith(mermaid_type.sequenceDiagram));
      if (!isSequenceDiagram) {
        openEditor.setDecorations(decorationType, []);
        return;
      }
      const isEnabled = trimedLefts
        .some((trimedLine) => trimedLine.startsWith("autonumber"));
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
        const range = getRange(
          lineChars,
          content.position.start.line,
          codeBlockInnerLine
        );
        if (range) {
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
    if (editor.document.languageId !== "markdown") {
      return null;
    }
    decorate(editor);
  });

  const disposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId !== "markdown") {
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
