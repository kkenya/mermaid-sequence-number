import { fromMarkdown } from 'mdast-util-from-markdown';
import * as vscode from 'vscode';

const VALID_LANGUAGE_ID = {
  markdown: 'markdown',
  mermaid: 'mermaid',
};
const MAX_LIMIT = 1000;
const DECORATION_POSITION: 'before' | 'after' = 'after';
const DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
  [DECORATION_POSITION]: {
    textDecoration: `;
      font-size: 0.8em;
      border-radius: 1em;
      padding: 0 0.2em;',
    `,
    margin: '0 0.5em;',
  },
  dark: {
    [DECORATION_POSITION]: {
      color: '#000',
      backgroundColor: '#FFF',
    },
  },
  light: {
    [DECORATION_POSITION]: {
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

const isEnabled = (document: vscode.TextDocument) => {
  return (
    Object.values(VALID_LANGUAGE_ID).includes(document.languageId) &&
    document.lineCount <= MAX_LIMIT
  );
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

type MessagePosition = {
  start: number;
  end: number;
  numberOfLines: number;
  numberOfSequences: number;
};

const getMessagePositions = (text: string): MessagePosition[] => {
  const lines = text.split('\n');
  const trimedLeftLines = lines.map((line) => line.trimLeft());

  const isSequenceDiagram = trimedLeftLines.some((trimedLeftLine) =>
    trimedLeftLine.startsWith(MERMAID.sequence.diagram)
  );
  if (!isSequenceDiagram) {
    return [];
  }
  const isEnabled = trimedLeftLines.some((trimedLine) =>
    trimedLine.startsWith(MERMAID.sequence.autonumber)
  );
  if (!isEnabled) {
    return [];
  }

  let numberOfSequences = 0;

  return lines.reduce<MessagePosition[]>((positions, line, numberOfLines) => {
    const trimedLeftLine = trimedLeftLines[numberOfLines];
    if (trimedLeftLine === undefined) {
      return positions;
    }
    const position = getMesseagePosition(line, trimedLeftLine);
    if (position) {
      return positions.concat({
        ...position,
        numberOfLines,
        numberOfSequences: ++numberOfSequences,
      });
    }
    return positions;
  }, []);
};

const decorateMarkdown = (editor: vscode.TextEditor) => {
  const decorationOptions: vscode.DecorationOptions[] = [];
  const ast = fromMarkdown(editor.document.getText());

  ast.children.forEach((content) => {
    const { position } = content;
    if (
      content.type !== MDAST.type ||
      content.lang !== MDAST.language ||
      position === undefined
    ) {
      return;
    }
    const messagePositions = getMessagePositions(content.value);

    messagePositions.forEach(
      ({ start, end, numberOfLines, numberOfSequences }) => {
        const numberOfLinesInMarkdown = position.start.line + numberOfLines;
        const range = new vscode.Range(
          new vscode.Position(numberOfLinesInMarkdown, start),
          new vscode.Position(numberOfLinesInMarkdown, end)
        );

        decorationOptions.push({
          range,
          renderOptions: {
            [DECORATION_POSITION]: {
              contentText: String(numberOfSequences),
            },
          },
        });
      }
    );
  });
  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

const decorateMmd = (editor: vscode.TextEditor) => {
  const messagePositions = getMessagePositions(editor.document.getText());

  const decorationOptions = messagePositions.map(
    ({ start, end, numberOfLines, numberOfSequences }) => {
      const range = new vscode.Range(
        new vscode.Position(numberOfLines, start),
        new vscode.Position(numberOfLines, end)
      );
      return {
        range,
        renderOptions: {
          [DECORATION_POSITION]: {
            contentText: String(numberOfSequences),
          },
        },
      };
    }
  );
  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

const decorate = (editor: vscode.TextEditor): void => {
  switch (editor.document.languageId) {
    case VALID_LANGUAGE_ID.markdown:
      return decorateMarkdown(editor);
    case VALID_LANGUAGE_ID.mermaid:
      return decorateMmd(editor);
  }
};

export function activate(context: vscode.ExtensionContext) {
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (!isEnabled(editor.document)) {
      return;
    }

    decorate(editor);
  });

  vscode.workspace.onDidChangeTextDocument(
    (event: vscode.TextDocumentChangeEvent) => {
      if (!isEnabled(event.document)) {
        return;
      }

      const openEditor = vscode.window.visibleTextEditors.find(
        (editor) => event.document.uri === editor.document.uri
      );
      if (openEditor === undefined) {
        return;
      }
      decorate(openEditor);
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeTextEditorSelection(
    (event: vscode.TextEditorSelectionChangeEvent) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        if (!isEnabled(event.textEditor.document)) {
          return;
        }
        decorate(event.textEditor);
      }
    },
    null,
    context.subscriptions
  );
}

export function deactivate() {
  console.debug('deactivated mermaid sequence number');
}
