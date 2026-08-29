import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Games } from "./components/Games";
import { ProductCatalog } from "./components/ProductCatalog";
import { Cta } from "./components/Cta";
import { CommunityLinks, ContactDonate } from "./components/ContactDonate";
import { Footer } from "./components/Footer";

/**
 * RDUC landing page — converted from Figma file iRXNzVGjfd7EzaeCi8jmvM,
 * frame "rduc-landing-page" (node 3:4, 1440x4411).
 */
export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CommunityLinks />
        <ProductCatalog />
        <Features />
        <Games />
        <Cta />
        <ContactDonate />
      </main>
      <Footer />
    </>
  );
}