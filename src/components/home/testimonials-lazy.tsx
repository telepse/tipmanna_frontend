import { getAllTestimonialsAction } from "@/actions/home";
import Testimonials from "./testimonials";

export default async function TestimonialsLazy() {
  const { data: testimonials } = await getAllTestimonialsAction();

  return <Testimonials testimonials={testimonials ?? []} />;
}
