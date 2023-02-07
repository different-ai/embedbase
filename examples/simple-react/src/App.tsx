import React from 'react';

const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0)


function App() {
  const [search, setSearch] = React.useState('');
  const [documents, setDocuments] = React.useState<{content: string; color: string}[]>([]);
  const handleSearchBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }
  const colourizeDocuments = () => {
    if (!search) return;
    fetch('http://localhost:8000/v1/dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
          return { content: document.content, color: 
            (document.content === topOne.document_content && 
              topOne.score > 0.8) ? 'red' : 'black' };
      }));
    });
  };
  const addDocument = () => {
    // hash of search bar + time
    const id = hashCode(search + Date.now().toString());
    fetch('http://localhost:8000/v1/dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [{
          data: search,
        }],
      }),
    }).then(() => setDocuments([...documents, { content: search, color: 'black' }]));
  }
  const clearIndex = () => {
    // /v1/search/clear
    fetch('http://localhost:8000/dev/clear', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(() => setDocuments([]));
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
            >{document.content}</li>
          ))}
        </ul>
      </div>
      {/* a button to clear index position absolute */}
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
