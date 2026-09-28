// Shared domain types, mirrored from the Supabase schema (supabase/migrations).

export type ProductForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'drops'
  | 'tube'
  | 'injection'
  | 'sachet'
  | 'spray'
  | 'inhaler'
  | 'device'
  | 'generic';

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  generic_name: string | null;
  brand: string | null;
  manufacturer: string | null;
  category_id: string;
  price: number;
  mrp: number;
  pack_size: string | null;
  prescription_required: boolean;
  in_stock: boolean;
  form: ProductForm;
  image_url: string | null;
  description: string | null;
  uses: string | null;
  side_effects: string | null;
  category?: Category | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
};

export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
  prescription_url: string | null;
  payment_method: 'COD';
  created_at: string;
  order_items?: OrderItem[];
};
