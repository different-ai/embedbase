import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// To apply the default browser preference instead of explicitly setting it.
// firebase.auth().useDeviceLanguage();
const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0)

// read firebase config from fb.json
const firebaseConfig = require('./fb.json');
const app = initializeApp(firebaseConfig);

function App() {
  const [search, setSearch] = React.useState('');
  const [documents, setDocuments] = React.useState<{data: string; color: string}[]>([]);
  const [idToken, setIdToken] = React.useState<string | null>(null);

  const handleSearchBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }
  const firebaseAuth = async () => {
    const provider = new GoogleAuthProvider();
    const auth = getAuth();
    const {user} = await signInWithPopup(auth, provider)
    const idToken = await user.getIdTokenResult();
    setIdToken(idToken.token);
  }
  const colourizeDocuments = () => {
    if (!search) return;
    fetch('http://localhost:8000/v1/dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        query: search,
      }),
    }).then((res) => res.json()).then((res) => {
      // get the highest score in res.similarities
      const topOne = res.similarities.reduce((a: any, b: any) => a.score > b.score ? a : b);
      // set to the document found in documents
      // red if close enough otherwise black
      setDocuments(documents.map((document) => {
          return { data: document.data, color: 
            (document.data === topOne.data && 
              topOne.score > 0.6) ? 'red' : 'black' };
      }));
    }).catch((err) => alert(err));
  };
  const addDocument = () => {
    fetch('http://localhost:8000/v1/dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        documents: [{
          data: search,
        }],
      }),
    }).then(() => setDocuments([...documents, { data: search, color: 'black' }]))
      .catch((err) => alert(err));
  }
  const clearIndex = () => {
    fetch('http://localhost:8000/v1/dev/clear', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    }).then(() => setDocuments([])).catch((err) => alert(err));
  }

  return (
    <>
      {/* a list of items centered horizontally and vertically */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* a search bar centered horizontally and vertically */}
        <input type="text" value={search} onChange={handleSearchBarChange}
          style={{ width: '100%', maxWidth: '500px', height: '50px', fontSize: '20px' }}
        />
        {/* a list of documents */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {documents.map((document, i) => (
            <li key={i} style={{ color: document.color,
              fontSize: '20px', margin: '10px 0' }}
            >{document.data}</li>
          ))}
        </ul>
      </div>
      <button style={{ position: 'absolute', top: '40%', right: '20%' }}
        onClick={() => firebaseAuth().catch((err) => alert(err))}>
        Login with Google
      </button>
      {idToken && <button
        style={{ position: 'absolute', top: '35%', right: '20%'}}
        // on hover show id token
        onClick={() => alert(idToken)}
      >Click me to see id token</button>}
      <button style={{ position: 'absolute', top: '30%', right: '20%' }}
        onClick={() => {
          addDocument();
          // clear the search bar
          setSearch('');
        }}>
        Add to index
      </button>
      <button style={{ position: 'absolute', top: '20%', right: '20%' }}
        onClick={colourizeDocuments}>
        Colourize documents
      </button>
      <button style={{ position: 'absolute', top: '10%', right: '20%' }}
        onClick={clearIndex}>
        Clear index
      </button>
    </>
  );
}

export default App;
