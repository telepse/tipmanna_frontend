import { getAllTestimonialsAction } from "@/actions/home";
import Testimonials from "./testimonials";
import { Testimonial } from "@/types/testimonial.types";

export default async function TestimonialsLazy() {
  const { data: testimonials } = await getAllTestimonialsAction();

  return (
    <Testimonials testimonials={testimonials as unknown as Testimonial[]} />
  );
}
