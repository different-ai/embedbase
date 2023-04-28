import { Sandpack } from '@codesandbox/sandpack-react'
import { useAppStore } from '@/lib/store'

const Add = `
import { useState } from "react";
import { addDocumentsToDataset } from "./helpers";

export const Add = ({ documents }) => {
  const [response, setResponse] = useState();
  const handleAdd = async () => {
    const res = await addDocumentsToDataset(documents, "dev-dataset");
    const data = await res.json();
    console.log(data);
    setResponse(data);
  };

  return (
    <div>
      <button onClick={handleAdd}>Add</button>
      {JSON.stringify(response)}
    </div>
  );
};
`
const App = `
// replace this with any documents you want
// keep the [{data: 'something to embed'}] format
const documents = [
  {
    data:
      "Whoever created the tradition of not seeing the bride in the wedding dress beforehand saved countless husbands everywhere from hours of dress shopping and will forever be a hero to all men."
  },
  {
    data:
      "We laugh at dogs getting excited when they hear a bark on TV, but if TV was a nonstop stream of unintelligible noises and then someone suddenly spoke to you in your language, you'd be pretty fucking startled too."
  },
  {
    data:
      "When you're a kid, you don't realize you're also watching your mom and dad grow up."
  }
];

export default function App() {
  return (
    <div className="App">
      <Add documents={documents} />
      <Search />
    </div>
  );
}

import { Add } from "./src/Add";
import { Search } from "./src/Search";
import "./styles.css";


`
const Search = `
import { useState } from "react";
import { searchDataset } from "./helpers";

export const Search = () => {
  const [query, setQuery] = useState();
  const [searchResults, setSearchResults] = useState([]);
  const handleChange = (e) => {
    setQuery(e.target.value);
  };
  const handleSearch = async () => {
    try {
      const res = await searchDataset(query, "dev-dataset");
      const data = await res.json();
      console.log(data);
      setSearchResults(data.similarities);
    } catch (e) {
      console.error(e);
    }
  };
  console.log(searchResults);

  return (
    <>
      <input onChange={handleChange} />
      <button onClick={handleSearch}>search</button>
      <h1>Most Similar</h1>
      <p>from most similar to least</p>
      {searchResults.map((result, index) => {
        return (
          <div key={index} style={{ marginBottom: "1rem" }}>
            {index + 1}. {result.data}{" "}
          </div>
        );
      })}
    </>
  );
};

`
const generateHelpers = (apiKey) => {
  return `
export let DATASET_ID = "dev";
export const URL = "https://api.embedbase.xyz";
export const API_KEY = "${apiKey}";

// that's how you add things to a dataset
export async function addDocumentsToDataset(documents, datasetId) {
  return await fetch(URL + "/v1/" + datasetId, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // make sure to follow the this format [{data: stringToEmbed}]
      documents
    })
  });
}

// that's how you search for things in a dataset
export async function searchDataset(query, datasetId) {
  return await fetch(URL + "/v1/" + datasetId + "/search", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query
    })
  });
}
`
}

export const PlaygroundSearchExisting = () => {
  const apiKey = useAppStore((state) => state.apiKey)

  return (
    <Sandpack
      template="react"
      theme={'dark'}
      files={{
        // weirdly this doesn't follow the src pattern
        '/App.js': App,
        '/src/Add.js': Add,
        '/src/Search.js': Search,
        '/src/helpers.js': generateHelpers(apiKey),
      }}
    />
  )
}
