import { Routes, Route } from "react-router-dom";
import NavBar from "./components/partials/Navbar";
import Home from "./components/Home";
import ContactUs from "./components/ContactUs";
import AboutUs from "./components/AboutUs";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Tournaments from "./components/Tournaments";
import Policies from "./components/Policies";
import TermsOfService from "./components/TermsOfService";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/aboutUs" element={<AboutUs />} />
        <Route path="/contactUs" element={<ContactUs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/termsOfService" element={<TermsOfService />} />
    </Routes>
    </>
  );
}

export default App;