import { getAllCausesAction } from "@/actions/home";
import Charities from "./charities";
import { Cause } from "@/types/cause.types";

export default async function CharitiesSection() {
  const { data: causes } = await getAllCausesAction();

  return <Charities causes={causes as unknown as Cause[]} />;
}
