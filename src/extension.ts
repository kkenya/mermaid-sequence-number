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
  after: {
    color: "#000",
    backgroundColor: "#FFF",
    textDecoration: `;
      font-size: 0.8em;
      padding: 0.1em;
      margin: 0.1em;
      border: solid;
      border-radius: 1em;
    `,
  },
});

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "mermaid-sequential-number" is now active!'
  );

  const disposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event === undefined) {
        return null;
      }
      if (event.document.languageId !== "markdown") {
        return null;
      }
      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document === event.document
      );
      if (editor === undefined) {
        return;
      }

      const tree = fromMarkdown(event.document.getText());
      console.debug(tree);
      // console.debug(inspect(tree));

      tree.children.forEach((content) => {
        if (
          content.type === MDADT_TYPE.codeBlock &&
          content.lang === language.mermaid
        ) {
          // content.position?.start;
          const codeBlockLines = content.value.split("\n");

          let col = 0;
          let codeBlockLn = 0;
          let numberOfSequence = 0;
          const decorations: vscode.DecorationOptions[] = [];
          codeBlockLines.forEach((lineChars) => {
            codeBlockLn++;
            // todo: trim space
            // todo: switch mermaid graph type
            const trimed = lineChars.trimLeft();
            console.log(trimed);
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
            // Alice->Bob: Solid line without arrow
            // Alice-->Bob: Dotted line without arrow
            // Alice->>Bob: Solid line with arrowhead
            // Alice-->>Bob: Dotted line with arrowhead
            // Alice-xBob: Solid line with a cross at the end
            // Alice--xBob: Dotted line with a cross at the end.
            // Alice-)Bob: Solid line with an open arrow at the end (async)
            // Alice--)Bob: Dotted line with a open arrow at the end (async)
            if (/^[a-zA-Z0-9]+(->|-->|-->>|-x|--x|-\)|--\))/.test(trimed)) {
              numberOfSequence++;
              const startResult = lineChars.match(/[a-zA-Z0-9]/);
              const endResult = lineChars.match(/\s*$/);
              if (content.position === undefined) {
                console.log("unexpected content");
                return;
              }
              if (startResult?.index && endResult?.index) {
                col++;
                console.log(
                  "ln: ",
                  codeBlockLn,
                  "col: ",
                  col,
                  "number of spaces: ",
                  startResult.index
                );
                const range = new vscode.Range(
                  // position: {
                  //   start: { line: 1, column: 1, offset: 0 },
                  //   end: { line: 100, column: 1, offset: 2769 }
                  // }
                  new vscode.Position(
                    content.position?.start.line + codeBlockLn - 1,
                    startResult.index
                  ),
                  new vscode.Position(
                    content.position?.start.line + codeBlockLn - 1,
                    endResult.index
                  )
                );

                decorations.push({
                  range,
                  renderOptions: {
                    after: {
                      contentText: String(numberOfSequence),
                    },
                  },
                });
              }
            }
          });
          editor.setDecorations(decorationType, decorations);
        }
      });
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
