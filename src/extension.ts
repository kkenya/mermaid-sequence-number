import { fromMarkdown } from "mdast-util-from-markdown";
import { inspect } from "unist-util-inspect";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "mermaid-sequential-number" is now active!'
  );

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

  // const disposable = vscode.window.onDidChangeActiveTextEditor(
  const disposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event === undefined) {
        return null;
      }
      if (event.document.languageId !== "markdown") {
        return null;
      }
      const tree = fromMarkdown(event.document.getText());
      // console.debug(inspect(tree));
      // console.debug(tree);
      tree.children.forEach((content) => {
        if (
          content.type === MDADT_TYPE.codeBlock &&
          content.lang === language.mermaid
        ) {
          const lines = content.value.split("\n");

          let isDiagram = false;
          const arr = [];
          let col = 0;
          let ln = 0;
          lines.forEach((line) => {
            ln++;
            // todo: trim space
            // todo: switch mermaid graph type
            const trimed = line.trimLeft();
            console.log(trimed);
            if (trimed.length === 0) {
              return;
            }
            if (trimed.startsWith(mermaid_identifier.comment)) {
              return;
            }
            if (trimed.startsWith(mermaid_type.sequenceDiagram)) {
              isDiagram = true;
              return;
            }
            if (
              trimed.startsWith(mermaid_identifier.participant) ||
              trimed.startsWith(mermaid_identifier.actor)
            ) {
              return;
            }
            // Alice->Bob: Solid line without arrow
            // Alice-->Bob: Dotted line without arrow
            // Alice->>Bob: Solid line with arrowhead
            // Alice-->>Bob: Dotted line with arrowhead
            // Alice-xBob: Solid line with a cross at the end
            // Alice--xBob: Dotted line with a cross at the end.
            // Alice-)Bob: Solid line with an open arrow at the end (async)
            // Alice--)Bob: Dotted line with a open arrow at the end (async)
            if (/^[a-zA-Z0-9]+(->|-->|-->>|-x|--x|-\)|--\))/.test(trimed)) {
              const result = line.match(/[a-zA-Z0-9]/);
              if (result?.index) {
                col++;
                console.log(
                  "number of spaces: ",
                  result.index,
                  "col: ",
                  col,
                  "ln: ",
                  ln
                );
              }
            }
          });
        }
      });
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
