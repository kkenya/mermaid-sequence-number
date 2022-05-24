import { fromMarkdown } from 'mdast-util-from-markdown';
import * as vscode from 'vscode';

/**
 * constants
 */
const VALID_LANGUAGE_ID = {
  markdown: 'markdown',
  mermaid: 'mermaid',
};
const MDAST = {
  type: 'code',
  language: 'mermaid',
} as const;
const MERMAID_SYNTAX = {
  sequence: {
    diagram: 'sequenceDiagram',
    autonumber: 'autonumber',
    comment: '%%',
    participant: 'participant',
    actor: 'actor',
  },
} as const;
const MESSAGE_ARROW_REGEXP = /-(>|->|->>|x|-x|\)|-\))/;
// configuration
const CONFIGURATION_SECTION = 'mermaidSequenceNumber';
const DECORATION_POSITION_MAP = {
  before: 'before',
  after: 'after',
} as const;

/**
 * configuration global variable
 */
let MAX_LINES: number;
let DECORATION_POSITION: typeof DECORATION_POSITION_MAP[keyof typeof DECORATION_POSITION_MAP];
let DECORATION_TYPE: vscode.TextEditorDecorationType;

function setGlobalFromConfiguration() {
  const config = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  const maxLines = config.get<number>('maxLines');
  if (maxLines === undefined) {
    throw new Error('unexpected maxLines');
  }
  MAX_LINES = maxLines;
  const decorationPosition =
    config.get<typeof DECORATION_POSITION>('decorationPosition');
  if (decorationPosition === undefined) {
    throw new Error('unexpected decorationPosition');
  }
  DECORATION_POSITION = decorationPosition;

  DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
    [decorationPosition]: {
      textDecoration: `;
      font-size: 0.8em;
      border-radius: 1em;
      padding: 0 0.2em;',
    `,
      margin: '0 0.5em;',
    },
    dark: {
      [decorationPosition]: {
        color: '#000',
        backgroundColor: '#FFF',
      },
    },
    light: {
      [decorationPosition]: {
        color: '#FFF',
        backgroundColor: '#000',
      },
    },
  });
  console.log(DECORATION_TYPE);
}

const isEnabled = (document: vscode.TextDocument) => {
  return (
    Object.values(VALID_LANGUAGE_ID).includes(document.languageId) &&
    document.lineCount <= MAX_LINES
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
    trimedLeft.startsWith(MERMAID_SYNTAX.sequence.comment) ||
    trimedLeft.startsWith(MERMAID_SYNTAX.sequence.participant) ||
    trimedLeft.startsWith(MERMAID_SYNTAX.sequence.actor)
  ) {
    return;
  }
  if (MESSAGE_ARROW_REGEXP.test(trimedLeft)) {
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

const getMessagePositions = (
  mermaidText: string,
  numberOfLinePararent = 0
): vscode.DecorationOptions[] => {
  const lines = mermaidText.split('\n');
  const trimedLeftLines = lines.map((line) => line.trimLeft());

  const isSequenceDiagram = trimedLeftLines.some((trimedLeftLine) =>
    trimedLeftLine.startsWith(MERMAID_SYNTAX.sequence.diagram)
  );
  if (!isSequenceDiagram) {
    return [];
  }
  const isEnabled = trimedLeftLines.some((trimedLine) =>
    trimedLine.startsWith(MERMAID_SYNTAX.sequence.autonumber)
  );
  if (!isEnabled) {
    return [];
  }

  let numberOfSequences = 0;

  const messagePositions = lines.reduce<MessagePosition[]>(
    (positions, line, numberOfLines) => {
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
    },
    []
  );

  return messagePositions.map(
    ({ start, end, numberOfLines, numberOfSequences }) => {
      const range = new vscode.Range(
        new vscode.Position(numberOfLines + numberOfLinePararent, start),
        new vscode.Position(numberOfLines + numberOfLinePararent, end)
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
};

const decorateMarkdown = (editor: vscode.TextEditor) => {
  const ast = fromMarkdown(editor.document.getText());

  let allDecorationOptions: vscode.DecorationOptions[] = [];
  ast.children.forEach((content) => {
    const { position } = content;
    if (
      content.type !== MDAST.type ||
      content.lang !== MDAST.language ||
      position === undefined
    ) {
      return;
    }
    const decorationOptions = getMessagePositions(
      content.value,
      position.start.line
    );
    allDecorationOptions = allDecorationOptions.concat(decorationOptions);
  });

  editor.setDecorations(DECORATION_TYPE, allDecorationOptions);
};

const decorateMermaid = (editor: vscode.TextEditor) => {
  const decorationOptions = getMessagePositions(editor.document.getText());

  editor.setDecorations(DECORATION_TYPE, decorationOptions);
};

const decorate = (editor: vscode.TextEditor): void => {
  switch (editor.document.languageId) {
    case VALID_LANGUAGE_ID.markdown:
      return decorateMarkdown(editor);
    case VALID_LANGUAGE_ID.mermaid:
      return decorateMermaid(editor);
  }
};

export function activate(context: vscode.ExtensionContext) {
  setGlobalFromConfiguration();
  vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration(CONFIGURATION_SECTION)) {
        setGlobalFromConfiguration();
      }
    },
    null,
    context.subscriptions
  );

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
