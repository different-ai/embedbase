import { Sandpack } from '@codesandbox/sandpack-react'
import { useApiKeys } from '../components/APIKeys'
import { useAppStore } from '@/lib/store'

export const PlagroundSearchCollection = () => {
  const apiKey = useAppStore((state) => state.apiKey)

  return (
    <Sandpack
      template={'vanilla'}
      theme={'dark'}
      files={{
        'index.js': generateIndexJS(
          apiKey || 'your api key goes here'
        ),
        'render.js': render,
      }}
    />
  )
}

// templates below
const render = `
import { search } from "./index";

const createOrReplaceSearchContainer = () => {
  if (document.getElementById("search-container")) {
    return document.getElementById("search-container");
  }

  const searchContainer = document.createElement("div");
  searchContainer.id = "search-container";
  app.appendChild(searchContainer);
  return searchContainer;
};

const searchAndRender = async () => {
  let searchInput = document.getElementById("searchInput").value;
  console.log("searching", searchInput);
  const response = await search(searchInput);

  const data = await response.json();
  console.log({ data });
  const searchContainer = createOrReplaceSearchContainer();
  console.log(searchContainer);
  const title = document.createElement("h1");
  title.innerHTML = "Search Results";
  searchContainer.appendChild(title);

  data.similarities.forEach((element) => {
    let searchResult = document.createElement("div");
    searchResult.innerHTML =
      element.data + " is " + element.score + " similar to " + data.query;
    searchContainer.appendChild(searchResult);
  });
};

/* add a input field with a button that calls an empty function called addToDataset */
let app = document.getElementById("app");

app.appendChild(document.createElement("br"));
/* create another input field that allows people to call a "search" function with a button */
let searchInput = document.createElement("input");
searchInput.setAttribute("type", "text");
searchInput.setAttribute("id", "searchInput");
app.appendChild(searchInput);
let searchButton = document.createElement("button");
searchButton.innerHTML = "Search";
searchButton.onclick = searchAndRender;
searchInput.onkeyup = (e) => {
  if (e.key === "Enter") {
    searchAndRender();
  }
};

app.appendChild(searchButton);

`

const generateIndexJS = (
  apiKey,
  url = 'https://api.embedbase.xyz',
  datasetId = 'dev'
) => `
// ignore this is just for rendering the buttons and input field
import "./render.js";

let DATASET_ID = "${datasetId}";
const URL = "${url}";
// where your api key goes
const API_KEY = "${apiKey}";

// that's how you search for things in a dataset
export async function search(searchInput) {
  return await fetch(URL + "/v1/" + DATASET_ID + "/search", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: searchInput
    })
  });
}

`
