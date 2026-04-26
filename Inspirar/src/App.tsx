import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import LogoCarousel from "./components/LogoCarousel";
import ValueProp from "./components/ValueProp";
import Testimonials from "./components/Testimonials";
import ContactForm from "./components/ContactForm";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-dark selection:bg-gold selection:text-dark">
      <Navbar />
      <main>
        <Hero />
        <LogoCarousel />
        <ValueProp />
        <Testimonials />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}

