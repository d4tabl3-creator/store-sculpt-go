import type React from "react";
import { OscuraTemplate } from "./OscuraTemplate";
import { VibranteTemplate } from "./VibranteTemplate";
import { CalidaTemplate } from "./CalidaTemplate";
import { TropicalTemplate } from "./TropicalTemplate";

export interface StoreTemplateStore {
  id: string;
  slug: string;
  name: string;
  niche: string;
  primary_color: string;
  template: string;
}

export interface StoreTemplateProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  stock: number;
  shipping_cost_cents: number;
}

export interface StoreTemplateProps {
  store: StoreTemplateStore;
  products: StoreTemplateProduct[];
  onAdd: (p: StoreTemplateProduct) => void;
  cartButton: React.ReactNode;
}

const map: Record<string, React.ComponentType<StoreTemplateProps>> = {
  oscura: OscuraTemplate,
  vibrante: VibranteTemplate,
  calida: CalidaTemplate,
  tropical: TropicalTemplate,
};

export function StoreTemplate(props: StoreTemplateProps) {
  const Template = map[props.store.template] ?? CalidaTemplate;
  return <Template {...props} />;
}
