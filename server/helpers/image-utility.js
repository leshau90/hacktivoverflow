'use strict'
const validURI = require('valid-url')
const { givesError } = require('./index')
const { Storage } = require('@google-cloud/storage')
const fs = require('fs')
const CLOUD_BUCKET = process.env.CLOUD_BUCKET
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT,
  keyFilename: process.env.KEYFILE_PATH
})
const bucket = storage.bucket(CLOUD_BUCKET)

const getPublicUrl = (filename) => {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`
}

const sendUploadToGCS = (req, res, next) => {

  if (!req.file) {
    console.log('no file no process')
    next()
  } else {
    const gcsname = `ecom-` + req.file.originalName
    // console.log(`file name will be ${gcsname}`);
    const file = bucket.file(gcsname)
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype
      }
    })

    stream.on('error', (err) => {
      console.log('ERROR ----', err);
      req.file.cloudStorageError = err
      fs.unlink(req.file.originalName,
        (err) => { console.log((err) ? `cannot delete ${req.file.originalName}` : `${req.file.originalName} has been deleted`) })
      next(err)
    })

    stream.on('finish', () => {
      req.file.cloudStorageObject = gcsname
      file.makePublic().then(() => {
        req.file.cloudStoragePublicUrl = getPublicUrl(gcsname)
        fs.unlink(req.file.originalName,
          (err) => { console.log((err) ? `cannot delete ${req.file.originalName}` : `${req.file.originalName} has been deleted`) })
        next()
      })
    })
    stream.end(req.file.buffer)
  }
}

const Multer = require('multer'),
  multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
      fileSize: 2 * 1024 * 1024
    },
  })

async function deleteFromBucket(fileName) {
  await storage.bucket(CLOUD_BUCKET).file(fileName).delete();
}


function fromBase64toFile(req, res, next) {
  console.log(`~~~~~~~~~inFrombase64~~~~~~~~~~~`)
  console.log(req.body.image)
  console.log(`~~~~~~~~~~~~~~~~~~~~`)
  let image = req.body.image
  if (!req.body.image) {
    console.log(`fromBase64toFile, it's already a link to another file, or the body request image is null`)
    next()
  } else {
    let fileType = `png`;
    if (/^data:image\/jpeg/.test(image)) { fileType = `jpg` }
    const base64Data = image.replace(/^data:image\/png;base64,|^data:image\/jpeg;base64,/, "");
    const newFilename = Date.now() + `.${fileType}`
    fs.writeFile(newFilename, base64Data, 'base64', function (err) {
      if (err) {
        next(givesError(500, `server cannot convert this file from base64, contact administrator`));
      } else {
        req.file = {}
        req.file.buffer = fs.readFileSync(newFilename)
        req.file.originalName = newFilename
        req.file.mimetype = `image/${(fileType == `png`) ? `png` : `jpeg`}`
        // req.file.tobeDeleted = newFilename
        next()
      }
    });
  }
}

module.exports = {
  deleteFromBucket,
  fromBase64toFile,
  sendUploadToGCS,
  multer
}