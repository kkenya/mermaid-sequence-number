import { fromMarkdown } from "mdast-util-from-markdown";
import { inspect } from "unist-util-inspect";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "mermaid-sequential-number" is now active!'
  );

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
      console.debug(inspect(tree));
      console.debug(tree);
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
