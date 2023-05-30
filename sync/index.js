const express = require('express')
const multer = require('multer')
const { createClient } = require('embedbase-js')



const upload = multer({ dest: 'uploads/' })
const app = express()

const url = 'https://api.embedbase.xyz'

app.get('/', (req, res) => {
  console.log('GET /')
  res.sendFile(__dirname + '/index.html')
})


app.post('/add-text', upload.single('file'), async (req, res) => {
  const apiKey = req.body.apiKey
  console.log('POST /add-text')
  const dataset = req.body.dataset

  if (!dataset) {
    console.log('Invalid Dataset')
    return res.status(401).send('Invalid Dataset')
  }


  if (apiKey.length !== 36) {
    console.log('Invalid API Key')
    return res.status(401).send('Invalid API Key')
  }
  const embedbase = createClient(url, apiKey)
  console.log('Created Embedbase Client')
  // get api key from header

  console.log(req)
  const text = require('fs').readFileSync(req.file.path, 'utf8')
  console.log('Read file text')
  const data = await embedbase.dataset(dataset).chunkAndBatchAdd([{
    data: text,
    metadata: {
      path: req.file.originalname
    }
  }])
  console.log('Added data to dataset')
  res.send(data)
})

app.listen(3000)
console.log('Listening on port 3000')