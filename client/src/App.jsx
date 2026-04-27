import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Upload from '../pages/Upload';
import Battle from '../pages/Battle';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/battle/:roomId" element={<Battle />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;