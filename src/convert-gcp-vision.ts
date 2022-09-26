import vision from '@google-cloud/vision';
import { Config } from './text-layer-converter-cli';

const client = new vision.ImageAnnotatorClient();

export const generateGCPVisionTextLayer = async (
  inputFolder: string,
  outputFolder: string,
  concurrency: number,
  config: Config
) => {
  /**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
  // Bucket where the file resides
  const { bucketName } = config;

  // Path to PDF file within bucket
  const fileName = 'E23KSNR0183.pdf';

  // The folder to store the results
  const outputPrefix = 'labelbox-pdf-ocr-output';

  const gcsSourceUri = `gs://${bucketName}/${fileName}`;
  const gcsDestinationUri = `gs://${bucketName}/${outputPrefix}/`;

  const inputConfig = {
    mimeType: 'application/pdf',
    gcsSource: {
      uri: gcsSourceUri,
    },
  };

  const outputConfig = {
    gcsDestination: {
      uri: gcsDestinationUri,
    },
  };

  const features = [{ type: 'DOCUMENT_TEXT_DETECTION' as const }];
  const request = {
    requests: [
      {
        inputConfig: inputConfig,
        features: features,
        outputConfig: outputConfig,
      },
    ],
  };

  const [operation] = await client.asyncBatchAnnotateFiles(request);
  const [filesResponse] = await operation.promise();

  const destinationUri = filesResponse?.responses?.[0]?.outputConfig?.gcsDestination?.uri;

  if (destinationUri) {
    console.log('Json saved to: ' + destinationUri);
  }
  else {
    console.log('The desgination uri is undefinfed');
  }
}