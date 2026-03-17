import { getAllCausesAction } from "@/actions/home";
import Charities from "./charities";

export default async function CharitiesSection() {
  const { data: causes } = await getAllCausesAction();

  return <Charities causes={causes} />;
}
