# Text Layer OCR CLI
CLI tool for transforming third party OCR formats into Labelbox's proprietary pdf text layer format

Scripts

Install Dependencies
```
npm install
```

Build the CLI
```
npm run build
```

Development - Build the CLI with hot reloading
```
npm run start
```

Usage
```
node dist/text-layer-converter-cli.js convert --filepath=<ocr_json_filepath> --format=<textract> --output-filepath=<output-text-layer-json-filepath>
```

Example:

Take in the OCR json file `my-textract-ocr-ouput.json` and output a new labelbox formatted textlayer file `labelbox-text-layer-format.json`
```
node dist/text-layer-converter-cli.js convert --filepath=my-textract-ocr-output.json --format=textract --output-filepath=labelbox-text-layer-format.json
```


Help page
```
node dist/text-layer-converter-cli.js convert --help
```
