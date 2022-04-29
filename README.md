# mermaid-sequence-number

Visual Studio Code's extention for [Mermaid](https://github.com/mermaid-js/mermaid).
This extention decorate each line on editor when `autonumber` is turned on in the sequence diagram.

## Usage

1. If you write sequence diagram turn on `autonumber` as [example](https://mermaid-js.github.io/mermaid/#/sequenceDiagram?id=sequencenumbers).

````mermaid
sequenceDiagram
    autonumber
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
````

2. Each message is decorated on editor.
**Dark theme**
![sequence number sample for dark theme](./docs/sequence_number_sample_dark.png)
**Light theme**
![sequence number sample for light theme](./docs/sequence_number_sample_light.png)

## Support

- Markdown ( `.md` )
- mermaid ( `.mm` )
- applied to file less than equal 1000 lines
