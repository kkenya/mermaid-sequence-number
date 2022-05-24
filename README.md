# Mermaid Sequence Number

Visual Studio Code's extension for [Mermaid](https://github.com/mermaid-js/mermaid).
This extension decorate each line on editor when `autonumber` is turned on in the sequence diagram.

## Usage

1. Write sequence diagram turn on `autonumber` like [example](https://mermaid-js.github.io/mermaid/#/sequenceDiagram?id=sequencenumbers).

![sequence diagram preview](./docs/sequence_diagram_preview.png)

2. Each message is decorated on editor.

**Dark theme**
![sequence number sample for dark theme](./docs/sequence_number_sample_dark.png)

**Light theme**
![sequence number sample for light theme](./docs/sequence_number_sample_light.png)

## Support

- Markdown ( `.md` )
- mermaid ( `.mmd` )

## Configuration

### Limit Line

extension is applied to file less than equal 1000 lines by default.

### Decoration Position

you can configure position of decoration.

#### after(default)

decorations are placed after message.

![decoration after message](./docs/decoration_after_message.png)

#### before

decorations are placed before message.

![decoration before message](./docs/decoration_before_message.png)
