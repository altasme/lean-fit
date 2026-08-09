import { Hero } from '../components/home/Hero';
import { ProductIntro } from '../components/home/ProductIntro';
import { WhyLeanFit } from '../components/home/WhyLeanFit';
import { Benefits } from '../components/home/Benefits';
import { Lifestyle } from '../components/home/Lifestyle';
import { ProductDetails } from '../components/home/ProductDetails';
import { IngredientsSpotlight } from '../components/home/IngredientsSpotlight';
import { SocialProof } from '../components/home/SocialProof';
import { Purchase } from '../components/home/Purchase';
import { FAQ } from '../components/home/FAQ';
import { FinalCTA } from '../components/home/FinalCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <ProductIntro />
      <WhyLeanFit />
      <Benefits />
      <Lifestyle />
      <ProductDetails />
      <IngredientsSpotlight />
      <SocialProof />
      <Purchase />
      <FAQ />
      <FinalCTA />
    </>
  );
}
