const fs = require('fs')
const http = require('http');

fs.readFile('pdf-100.json', (err, data) => {
  console.log('data: ', data);
  const assetJson = JSON.parse(data);
  assetJson.forEach(({ pdfUrl }) => {
    const pdfFilenameTokens = pdfUrl.split('/');
    const pdfFilename = pdfFilenameTokens[pdfFilenameTokens.length - 1];
    const pdfFile = fs.createWriteStream(pdfFilename);
    http.get(pdfUrl, (response) => {
      response.pipe(pdfFile);
      // after download completed close filestream
      file.on("finish", () => {
        file.close();
        console.log("Download Completed");
      });
    })
  })
});