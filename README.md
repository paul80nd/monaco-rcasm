# Monaco Relay Computer Assembly

Relay Computer Assembly language plugin for the Monaco Editor
(based on [microsoft/monaco-html](https://github.com/microsoft/monaco-html)).
It provides the following features when editing rcasm files:
* Code completion
* Formatting
* Document Highlights
* Link detection
* Syntax highlighting

Internally the rcasm plugin uses the [vscode-rcasm-languageservice](https://github.com/paul80nd/vscode-rcasm-languageservice)
node module, providing the implementation of the functionally listed above.

## Installing

This npm module is bundled and distributed in the [monaco-editor](https://github.com/paul80nd/monaco-editor) npm module.

## Development

* `git clone https://github.com/paul80nd/monaco-rcasm`
* `cd monaco-rcasm`
* `npm install .`
* `npm run watch`
* open `$/monaco-rcasm/test/index.html` in your favorite browser.

## License
[MIT](https://github.com/paul80nd/monaco-rcasm/blob/master/LICENSE.md)
