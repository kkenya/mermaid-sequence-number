import { fromMarkdown } from 'mdast-util-from-markdown';
import * as vscode from 'vscode';

const VALID_LANGUAGE_IDS = ['markdown', 'mermaid'];
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

const isEnable = (document: vscode.TextDocument) => {
  return (
    VALID_LANGUAGE_IDS.includes(document.languageId) &&
    document.lineCount <= MAX_LIMIT
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
  if (editor.document.languageId === 'markdown') {
    decorateMarkdown(editor);
  } else if (editor.document.languageId) {
    decorateMmd(editor);
  }
};

type MessagePosition = {
  start: number;
  end: number;
  numberOfLines: number;
  numberOfSequences: number;
};

const commonProcess = (
  editor: vscode.TextEditor,
  editorText: string
): MessagePosition[] => {
  const lines = editorText.split('\n');
  const trimedLeftLines = lines.map((line) => line.trimLeft());

  const isSequenceDiagram = trimedLeftLines.some((trimedLeftLine) =>
    trimedLeftLine.startsWith(MERMAID.sequence.diagram)
  );
  if (!isSequenceDiagram) {
    resetDecorators(editor);
    return [];
  }
  const isEnabled = trimedLeftLines.some((trimedLine) =>
    trimedLine.startsWith(MERMAID.sequence.autonumber)
  );
  if (!isEnabled) {
    resetDecorators(editor);
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
      positions.push({
        start: position.start,
        end: position.end,
        numberOfLines,
        numberOfSequences: ++numberOfSequences,
      });
    }
    return positions;
  }, []);
};

const decorateMarkdown = (editor: vscode.TextEditor) => {
  const ast = fromMarkdown(editor.document.getText());

  let decorationOptions: vscode.DecorationOptions[] = [];
  ast.children.forEach((content) => {
    if (content.type !== MDAST.type || content.lang !== MDAST.language) {
      return;
    }
    const messagePositions = commonProcess(editor, content.value);
    messagePositions.forEach(
      ({ start, end, numberOfLines, numberOfSequences }) => {
        if (content.position === undefined) {
          return;
        }
        const numberOfLinesInDocument =
          content.position.start.line + numberOfLines;
        const range = new vscode.Range(
          new vscode.Position(numberOfLinesInDocument, start),
          new vscode.Position(numberOfLinesInDocument, end)
        );
        decorationOptions.push({
          range,
          renderOptions: {
            [DECORATION_POSITION]: {
              contentText: String(++numberOfSequences),
            },
          },
        });
      }
    );
  });
  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

const decorateMmd = (editor: vscode.TextEditor) => {
  let decorationOptions: vscode.DecorationOptions[] = [];
  const messagePositions = commonProcess(editor, editor.document.getText());
  messagePositions.forEach(
    ({ start, end, numberOfLines, numberOfSequences }) => {
      const range = new vscode.Range(
        new vscode.Position(numberOfLines, start),
        new vscode.Position(numberOfLines, end)
      );
      decorationOptions.push({
        range,
        renderOptions: {
          [DECORATION_POSITION]: {
            contentText: String(++numberOfSequences),
          },
        },
      });
    }
  );
  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

export function activate(context: vscode.ExtensionContext) {
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (!isEnable(editor.document)) {
      return;
    }

    decorate(editor);
  });

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (!isEnable(event.document)) {
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
