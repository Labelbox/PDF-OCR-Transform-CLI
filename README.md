# PDF-OCR-Transform-CLI

CLI tool for transforming third party OCR formats into Labelbox's proprietary pdf text layer format. The CLI takes a folder containing pdfs as input, runs an OCR algorithm on the pdfs, and produces Labelbox text layer json files as an output.

Currently Supported OCR formats:

- Textract

# Prerequisites

The CLI invokes the `aws` cli behind the scenes to upload the pdfs to s3 and invoke Textract on them. You must have the aws cli installed gloablly and configured for your aws user.

[Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

[Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-prereqs.html)

# Configuration

There is a configuration file named `config.json` at the root level of the directory that must be updated before first running the CLI.

```
{
  // The name of the bucket in your cloud provider that pdfs will be uploaded to
  "bucketName": "<name_of_s3_bucket>"
}
```

# Usage

Included are bundled executables for multiple platfoms `text-layermacos`, `textlayer-linux`, `textlayer-win.exe`. These provide a more portable version of the cli that don't require you to install all the necessary dependencies with `npm install`.

## Commands:

`convert` - Run OCR on all pdfs contained in the input folder and convert the result into Labelbox's text layer JSON.

`convert --inputFolder <input_folder_containing_pdfs> --format <aws-textract> --outputFolder <output_folder> --concurrency 10`

`--inputFolder` The input folder containing the pdfs

`--format` The OCR format to use (aws-textract, google-cloud-vision)

`--outputFolder` The output folder to place the generated text layer json files

`--concurrency` How many pdfs to process at the same time. CAUTION: Setting this value too high can result in rate limits being reached.

Example (Mac)

```
./textlayer-macos convert --inputFolder input --format aws-textract --outputFolder output --concurrency 10
```

`validate` - Validates the provided text layer json

`validate --textLayerFilepath <text_layer_filepath>`

Example (Mac)

`./textlayer-macos validate --textLayerInputFile textlayer.json`

Help page

```
./textLayer convert --help
```

# (Optional) Build Scripts

You only need to build the cli if you wish to run the source code locally as opposed to using the provided executables.

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

The CLI has been bundled with [pkg](https://www.npmjs.com/package/pkg).

# Ad HOC Transform Scripts

GCP OCR:
To transform GCP OCR JSON format into Labelbox's format, run the python script located in

```
/src/scripts/gcloud/gcp-vision-to-lb-text-layer.py
```

Example:

```
cd src/scripts/gcloud/ & python3 gcp-vision-to-lb-text-layer.py <input_filename.json>
```

This will output the corresponding in the same directory with "-lb-text-layer.json" appended to the filename.

Adobe:

To transform Adobe OCR JSON format into Labelbox's format, run the python script located in

```
/src/scripts/adobe/adobe-ocr-to-lb-text-layer.py
```

Example:

```
cd src/scripts/adobe & python3 adobe-ocr-to-lb-text-layer.py
```

This script will attempt to transform all .json files in the directory in to Labelbox's text layer format.

Google Document AI:

To transform Google Document AI format into Labelbox's format, run the python script located in

```
/src/scripts/adobe/document-AI-to-lb-text-layer.py
```

Example:

```
cd src/scripts/documentAI & python3 document-AI-to-lb-text-layer.py
```

This script will attempt to transform all .json files in the directory in to Labelbox's text layer format.