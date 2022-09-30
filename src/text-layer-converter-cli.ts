#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateTextractTextLayer } from './convert-textract';
import fs from 'fs';
import { match } from 'ts-pattern';
import { generateGCPVisionTextLayer } from './convert-gcp-vision';

export type Config = {
  bucketName: string;
};

const config = JSON.parse(fs.readFileSync('config.json').toString()) as Config;
const supportedOCRFormats = ['aws-textract', 'google-cloud-vision'];

yargs(hideBin(process.argv))
  .command(
    'convert',
    'Convert an input folder containing pdfs into the Labelbox text layer format',
    (yargs) => (
      yargs
        .option('inputFolder', {
          type: 'string',
          describe: 'The filepath to the folder containing the pdfs you want to generate text layers for.',
          demandOption: true
        })
        .option('format', {
          type: 'string',
          choices: supportedOCRFormats,
          default: 'aws-textract'
        })
        .option('outputFolder', {
          type: 'string',
          description: 'The output folder filepath. Defaults to "output/"',
          default: 'output'
        })
        .option('concurrency', {
          type: 'number',
          description: 'Number of pdfs to process at the same time. CAUTION: Setting this number too high can cause request limits to be reached',
          default: 10
        })
    ),
    ({ inputFolder, format, outputFolder, concurrency }) => {
      match(format)
        .with('aws-textract', () => generateTextractTextLayer(inputFolder, outputFolder, concurrency, config))
        .with('google-cloud-vision', () => generateGCPVisionTextLayer(inputFolder, outputFolder, concurrency, config))
        .otherwise(() => console.log(`Unsupported format: ${format}. Supported formats: ${JSON.stringify(supportedOCRFormats)}`))
    }
  )
  .strictCommands()
  .parse();