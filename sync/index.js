const express = require('express')
const multer = require('multer')
const { createClient } = require('embedbase-js')



const upload = multer({ dest: 'uploads/' })
const app = express()

const url = 'https://api.embedbase.xyz'

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})


app.post('/add-text', upload.single('file'), async (req, res) => {
  const apiKey = req.body.apiKey
  const dataset = req.body.dataset

  if (!dataset) {
    return res.status(401).send('Invalid Dataset')
  }


  if (apiKey.length !== 36) {
    return res.status(401).send('Invalid API Key')
  }
  const embedbase = createClient(url, apiKey)
  // get api key from header
  const text = require('fs').readFileSync(req.file.path, 'utf8')
  const data = await embedbase.dataset(dataset).chunkAndBatchAdd([{
    data: text,
    metadata: {
      path: req.file.originalname
    }
  }])
  res.send(data)
})

app.listen(3000)
