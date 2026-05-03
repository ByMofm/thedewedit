import { Hero } from "@/components/home/Hero";
import { BenefitsStrip } from "@/components/home/BenefitsStrip";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BrandStory } from "@/components/home/BrandStory";
import { InstagramGrid } from "@/components/home/InstagramGrid";
import { Newsletter } from "@/components/home/Newsletter";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BenefitsStrip />
      <CategoryGrid />
      <FeaturedProducts />
      <BrandStory />
      <InstagramGrid />
      <Newsletter />
    </>
  );
}
