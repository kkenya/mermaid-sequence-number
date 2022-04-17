import { fromMarkdown } from 'mdast-util-from-markdown';
import * as vscode from 'vscode';

const LIMIT = 1000;
const MARKDOWN_LANGUAGE_ID = 'markdown';
const NUMBER_POSITION: 'before' | 'after' = 'after';
const DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
  [NUMBER_POSITION]: {
    textDecoration: `;
      font-size: 0.8em;
      border-radius: 1em;
      padding: 0 0.2em;',
    `,
    margin: '0 0.5em;',
  },
  dark: {
    [NUMBER_POSITION]: {
      color: '#000',
      backgroundColor: '#FFF',
    },
  },
  light: {
    [NUMBER_POSITION]: {
      color: '#FFF',
      backgroundColor: '#000',
    },
  },
});
const MDAST = {
  type: 'code',
  language: 'mermaid',
} as const;
const MERMAID = {
  sequence: {
    diagram: 'sequenceDiagram',
    autonumber: 'autonumber',
    comment: '%%',
    participant: 'participant',
    actor: 'actor',
  },
} as const;

const arrowRe = /-(>|->|->>|x|-x|\)|-\))/;

const isEnableExtention = (document: vscode.TextDocument) => {
  return (
    document.languageId === MARKDOWN_LANGUAGE_ID && document.lineCount <= LIMIT
  );
};

const resetDecorators = (editor: vscode.TextEditor) => {
  editor.setDecorations(DECORATION_TYPE, []);
};

const getMesseagePosition = (
  line: string,
  trimedLeft: string
): {
  start: number;
  end: number;
} | void => {
  if (
    trimedLeft.length === 0 ||
    trimedLeft.startsWith(MERMAID.sequence.comment) ||
    trimedLeft.startsWith(MERMAID.sequence.participant) ||
    trimedLeft.startsWith(MERMAID.sequence.actor)
  ) {
    return;
  }
  if (arrowRe.test(trimedLeft)) {
    return {
      start: line.length - trimedLeft.length,
      end: line.trimRight().length,
    };
  }
};

const decorate = (editor: vscode.TextEditor) => {
  const ast = fromMarkdown(editor.document.getText());

  const decorationOptions: vscode.DecorationOptions[] = [];
  ast.children.forEach((content) => {
    if (content.type !== MDAST.type || content.lang !== MDAST.language) {
      return;
    }
    const lines = content.value.split('\n');
    const trimedLeftLines = lines.map((line) => line.trimLeft());

    const isSequenceDiagram = trimedLeftLines.some((trimedLeftLine) =>
      trimedLeftLine.startsWith(MERMAID.sequence.diagram)
    );
    if (!isSequenceDiagram) {
      resetDecorators(editor);
      return;
    }
    const isEnabled = trimedLeftLines.some((trimedLine) =>
      trimedLine.startsWith(MERMAID.sequence.autonumber)
    );
    if (!isEnabled) {
      resetDecorators(editor);
      return;
    }

    let numberOfSequence = 0;

    lines.forEach((line, numberOfLines) => {
      if (content.position === undefined) {
        console.error('unexpected content');
        return;
      }
      const trimedLeftLine = trimedLeftLines[numberOfLines];
      if (trimedLeftLine === undefined) {
        return;
      }
      const position = getMesseagePosition(line, trimedLeftLine);
      if (position) {
        const numberOfLinesInDocument =
          content.position.start.line + numberOfLines;
        const range = new vscode.Range(
          new vscode.Position(numberOfLinesInDocument, position.start),
          new vscode.Position(numberOfLinesInDocument, position.end)
        );

        decorationOptions.push({
          range,
          renderOptions: {
            [NUMBER_POSITION]: {
              contentText: String(++numberOfSequence),
            },
          },
        });
      }
    });
  });
  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

export function activate(context: vscode.ExtensionContext) {
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (!isEnableExtention(editor.document)) {
      return;
    }

    decorate(editor);
  });

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (!isEnableExtention(event.document)) {
        return;
      }

      const [openEditor] = vscode.window.visibleTextEditors.filter(
        (editor) => editor.document.uri === event.document.uri
      );
      if (openEditor === undefined) {
        return;
      }
      decorate(openEditor);
    },
    null,
    context.subscriptions
  );
}

export function deactivate() {}
