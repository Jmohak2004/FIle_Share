import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Upload from '../pages/Upload';
import Battle from '../pages/Battle';
import Replay from '../pages/Replay';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/battle/:roomId" element={<Battle />} />
        <Route path="/replay/:battleId" element={<Replay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;