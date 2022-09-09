# Text Layer OCR CLI
CLI tool for transforming third party OCR formats into Labelbox's proprietary pdf text layer format

Scripts

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
