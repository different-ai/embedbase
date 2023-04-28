import { Sandpack } from '@codesandbox/sandpack-react'
import { useAppStore } from '@/lib/store'

export const PlaygroundAddToCollection = () => {
  const apiKey = useAppStore((state) => state.apiKey)

  return (
    <Sandpack
      template={'vanilla'}
      theme={'dark'}
      files={{
        'index.js': generateIndexJS(
          apiKey ||
            'First generate an api key check above for a blue button'
        ),
        'render.js': render,
      }}
    />
  )
}

// templates below
const render = `
import { search } from "./index";
import { addToDataset } from "./index";

const addToDatasetAndRender = async () => {
  let input = document.getElementById("input").value;
  const res = await addToDataset(input);
  // add html response here
  res.json().then((data) => {
    console.log(data);
    const app = document.getElementById("app");
    const title = document.createElement("h1");
    title.innerHTML = "Added to Collection";
    app.appendChild(title);
    const result = document.createElement("div");
    result.innerHTML = JSON.stringify(data);
    app.appendChild(result);
  });

};

/* add a input field with a button that calls an empty function called addToDataset */
let app = document.getElementById("app");
let input = document.createElement("input");
input.setAttribute("type", "text");
input.setAttribute("id", "input");
app.appendChild(input);
let button = document.createElement("button");
button.innerHTML = "Add to Collection";
button.onclick = addToDatasetAndRender;
app.appendChild(button);
app.appendChild(document.createElement("br"));
/* create another input field that allows people to call a "search" function with a button */
`

const generateIndexJS = (
  apiKey,
  url = 'https://api.embedbase.xyz',
  datasetId = 'dev'
) => `// this can be whatever you want
let DATASET_ID = "${datasetId}";
const URL = "${url}";
// where your api key goes
const API_KEY = "${apiKey}";

// that's how you add things to a dataset
export async function addToDataset(input) {
  return await fetch(URL + "/v1/" + DATASET_ID, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      documents: [
        {
          data: input
        }
      ]
    })
  });
}
// ignore this is just for rendering the buttons and input field
import "./render.js";


`
